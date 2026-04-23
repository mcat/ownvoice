import { describe, it, expect, beforeEach, vi } from "vitest";
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
 */
function installOPFSMock() {
  const store = new Map<string, string>();

  function makeFileHandle(path: string) {
    return {
      getFile: async () => {
        const data = store.get(path) ?? "";
        return new File([data], path.split("/").pop() ?? "");
      },
      createWritable: async () => ({
        write: async (data: unknown) => {
          store.set(path, String(data));
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

  return { store };
}

beforeEach(async () => {
  installOPFSMock();
  await clearIndex();
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
});
