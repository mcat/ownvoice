import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  recordHash,
  removePatientHashes,
  getPatientHashes,
  setFingerprint,
  getFingerprint,
  clearIndex,
} from "./patientIndex";

/**
 * Minimal OPFS mock — enough for patientIndex's file-based persistence.
 * The module only ever creates one file (patient-index.json) inside a
 * single directory (audio-cache-v3), so the mock is deliberately small.
 *
 * Returns a `writes` counter so timing tests can assert how many times
 * the index was flushed to disk (debounced-write coalescing, clearIndex
 * cancellation, etc.).
 */
function installOPFSMock() {
  const store = new Map<string, string>();
  const writes: { path: string; data: string }[] = [];

  function makeFileHandle(path: string) {
    return {
      getFile: async () => {
        const data = store.get(path) ?? "";
        return new File([data], path.split("/").pop() ?? "");
      },
      createWritable: async () => ({
        write: async (data: unknown) => {
          const s = String(data);
          store.set(path, s);
          writes.push({ path, data: s });
        },
        close: async () => {},
      }),
    };
  }

  function makeDirHandle(prefix: string) {
    return {
      getFileHandle: async (name: string, _opts?: { create?: boolean }) =>
        makeFileHandle(`${prefix}/${name}`),
      getDirectoryHandle: async (
        name: string,
        _opts?: { create?: boolean },
      ) => makeDirHandle(`${prefix}/${name}`),
    };
  }

  const root = makeDirHandle("");

  Object.defineProperty(navigator, "storage", {
    value: {
      getDirectory: vi.fn(() => Promise.resolve(root)),
      persist: vi.fn(() => Promise.resolve(true)),
    },
    configurable: true,
    writable: true,
  });

  return { store, writes };
}

let mock: ReturnType<typeof installOPFSMock>;

beforeEach(async () => {
  mock = installOPFSMock();
  await clearIndex();
  // clearIndex itself writes "{}" once during setup; reset after so each
  // test's `writes` counts its own effects only.
  mock.writes.length = 0;
});

describe("patientIndex", () => {
  it("records and retrieves hashes per patient", async () => {
    await setFingerprint("p1", "fp1");
    await recordHash("p1", "hash-abc");
    await recordHash("p1", "hash-def");
    const hashes = await getPatientHashes("p1");
    expect(hashes).toEqual(new Set(["hash-abc", "hash-def"]));
  });

  it("records fingerprint", async () => {
    await setFingerprint("p1", "fingerprint-1");
    expect(await getFingerprint("p1")).toBe("fingerprint-1");
  });

  it("removePatientHashes returns all hashes then clears them", async () => {
    await setFingerprint("p1", "fp1");
    await recordHash("p1", "h1");
    await recordHash("p1", "h2");
    const removed = await removePatientHashes("p1");
    expect(removed).toEqual(new Set(["h1", "h2"]));
    expect(await getPatientHashes("p1")).toEqual(new Set());
    expect(await getFingerprint("p1")).toBeNull();
  });

  it("recordHash is a no-op for unknown patient (fingerprint must exist first)", async () => {
    await recordHash("unknown", "h1");
    expect(await getPatientHashes("unknown")).toEqual(new Set());
  });

  it("getFingerprint returns null for unknown patient", async () => {
    expect(await getFingerprint("never-added")).toBeNull();
  });

  it("removePatientHashes returns empty set for unknown patient (no throw)", async () => {
    const removed = await removePatientHashes("never-added");
    expect(removed).toEqual(new Set());
  });

  it("getPatientHashes returns a fresh Set (mutating it doesn't affect internal state)", async () => {
    await setFingerprint("p1", "fp");
    await recordHash("p1", "h1");
    const h1 = await getPatientHashes("p1");
    h1.add("hacked");
    const h2 = await getPatientHashes("p1");
    expect(h2).toEqual(new Set(["h1"]));
    expect(h1).not.toBe(h2); // different Set references
  });

  it("setFingerprint preserves existing hashes when updating fingerprint for same patient", async () => {
    await setFingerprint("p1", "fp1");
    await recordHash("p1", "h1");
    await recordHash("p1", "h2");
    await setFingerprint("p1", "fp2"); // update fingerprint
    expect(await getFingerprint("p1")).toBe("fp2");
    expect(await getPatientHashes("p1")).toEqual(new Set(["h1", "h2"]));
  });

  it("different patients have independent fingerprints and hash sets", async () => {
    await setFingerprint("p1", "fp1");
    await setFingerprint("p2", "fp2");
    await recordHash("p1", "h1");
    await recordHash("p2", "h2");
    expect(await getFingerprint("p1")).toBe("fp1");
    expect(await getFingerprint("p2")).toBe("fp2");
    expect(await getPatientHashes("p1")).toEqual(new Set(["h1"]));
    expect(await getPatientHashes("p2")).toEqual(new Set(["h2"]));
    // Removing p1 leaves p2 untouched
    await removePatientHashes("p1");
    expect(await getFingerprint("p2")).toBe("fp2");
    expect(await getPatientHashes("p2")).toEqual(new Set(["h2"]));
  });

  it("removePatientHashes persists the deletion (flushes immediately)", async () => {
    await setFingerprint("p1", "fp");
    await recordHash("p1", "h1");
    mock.writes.length = 0; // reset counter after setup
    await removePatientHashes("p1");
    // Remove forces an immediate flush; writes should include the post-remove shape
    expect(mock.writes.length).toBeGreaterThanOrEqual(1);
    const last = mock.writes[mock.writes.length - 1];
    expect(last.path).toContain("patient-index.json");
    const parsed = JSON.parse(last.data);
    expect(parsed["p1"]).toBeUndefined();
  });

  it("flushed write contains the correct persisted shape", async () => {
    await setFingerprint("p1", "fp1");
    await recordHash("p1", "h1");
    await recordHash("p1", "h2");
    mock.writes.length = 0;
    // Trigger an immediate flush via removePatientHashes of a different
    // (nonexistent) patient — doesn't modify state, but still a deterministic
    // way to observe the flush path. Actually: better, call removePatientHashes
    // on p1 which is the only documented immediate-flush path.
    // For this test, use setFingerprint-then-remove to observe shape.
    await removePatientHashes("p1");
    // At this point, writes[0] should have `{}` (p1 removed)
    const last = JSON.parse(mock.writes[mock.writes.length - 1].data);
    expect(last).toEqual({});
  });
});

describe("patientIndex debounced writes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("multiple recordHash calls coalesce into one debounced write after 500ms", async () => {
    // setFingerprint uses fake timers too; seed outside the coalesce window
    await setFingerprint("p1", "fp");
    // Advance past the initial debounce so setFingerprint's write flushes
    await vi.advanceTimersByTimeAsync(500);
    mock.writes.length = 0;

    // Now: three rapid recordHash calls within the 500ms window
    await recordHash("p1", "h1");
    await recordHash("p1", "h2");
    await recordHash("p1", "h3");
    expect(mock.writes.length).toBe(0); // debounce hasn't fired yet

    await vi.advanceTimersByTimeAsync(500);
    expect(mock.writes.length).toBe(1); // coalesced into a single write

    const written = JSON.parse(mock.writes[0].data);
    expect(new Set(written["p1"].hashes)).toEqual(new Set(["h1", "h2", "h3"]));
  });

  it("clearIndex cancels pending debounced write", async () => {
    await setFingerprint("p1", "fp");
    await vi.advanceTimersByTimeAsync(500);
    mock.writes.length = 0;

    await recordHash("p1", "h1");
    // A debounced write is pending at t+500
    await clearIndex();
    // clearIndex wrote "{}" synchronously as part of its cleanup
    const clearWrites = mock.writes.length;
    expect(clearWrites).toBeGreaterThanOrEqual(1);
    // The LAST write should be the "{}" from clearIndex
    expect(mock.writes[clearWrites - 1].data).toBe("{}");
    const baselineWrites = mock.writes.length;

    // Advance past what WOULD have been the recordHash's debounced flush
    await vi.advanceTimersByTimeAsync(1000);
    // No additional spurious write should fire — clearIndex cancelled the timer
    expect(mock.writes.length).toBe(baselineWrites);
  });
});
