import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { resumableDownload } from "./resumableDownload";

type OPFSStore = Map<string, ArrayBuffer>;

function createOPFSMock(): { root: FileSystemDirectoryHandle; store: OPFSStore } {
  const store: OPFSStore = new Map();
  const makeFileHandle = (path: string, opts?: { create?: boolean }) => {
    if (!opts?.create && !store.has(path)) {
      throw new DOMException("Not found", "NotFoundError");
    }
    if (opts?.create && !store.has(path)) store.set(path, new ArrayBuffer(0));
    return {
      getFile: async () =>
        new File([store.get(path) ?? new ArrayBuffer(0)], path.split("/").pop() ?? ""),
      createWritable: async (writeOpts?: { keepExistingData?: boolean }) => {
        let buf = writeOpts?.keepExistingData
          ? new Uint8Array(store.get(path) ?? new ArrayBuffer(0))
          : new Uint8Array(0);
        let cursor = buf.byteLength;
        return {
          seek: async (offset: number) => {
            cursor = offset;
          },
          write: async (data: ArrayBuffer | Uint8Array) => {
            const chunk = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
            const needed = cursor + chunk.byteLength;
            if (needed > buf.byteLength) {
              const next = new Uint8Array(needed);
              next.set(buf, 0);
              buf = next;
            }
            buf.set(chunk, cursor);
            cursor += chunk.byteLength;
          },
          close: async () => {
            store.set(path, buf.buffer.slice(0, buf.byteLength));
          },
        };
      },
    } as unknown as FileSystemFileHandle;
  };
  const makeDirHandle = (prefix: string): FileSystemDirectoryHandle =>
    ({
      getFileHandle: async (name: string, opts?: { create?: boolean }) =>
        makeFileHandle(`${prefix}/${name}`, opts),
      getDirectoryHandle: async (name: string) => makeDirHandle(`${prefix}/${name}`),
      removeEntry: async (name: string) => {
        const target = `${prefix}/${name}`;
        for (const key of [...store.keys()]) {
          if (key === target || key.startsWith(`${target}/`)) store.delete(key);
        }
      },
    }) as unknown as FileSystemDirectoryHandle;
  return { root: makeDirHandle(""), store };
}

describe("resumableDownload", () => {
  let opfs: ReturnType<typeof createOPFSMock>;
  beforeEach(() => {
    opfs = createOPFSMock();
  });
  afterEach(() => vi.restoreAllMocks());

  it("downloads a fresh file and writes bytes to OPFS", async () => {
    const body = new Uint8Array([1, 2, 3, 4, 5]);
    globalThis.fetch = vi.fn(async () =>
      new Response(body, {
        status: 200,
        headers: { "content-length": String(body.byteLength) },
      }),
    ) as typeof fetch;

    const progress: number[] = [];
    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
      onProgress: (p) => progress.push(p.bytesWritten),
    });

    expect(new Uint8Array(opfs.store.get("/a.onnx")!)).toEqual(body);
    expect(progress.at(-1)).toBe(5);
  });

  it("resumes a partial download using Range: bytes=N-", async () => {
    opfs.store.set("/a.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder().encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 }))
        .buffer as ArrayBuffer,
    );

    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("range")).toBe("bytes=3-");
      return new Response(new Uint8Array([4, 5]), {
        status: 206,
        headers: { "content-length": "2", "content-range": "bytes 3-4/5" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
    });

    expect(new Uint8Array(opfs.store.get("/a.onnx")!)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("restarts from byte 0 when server returns 200 instead of 206 on a resume attempt", async () => {
    // Some hospital captive portals / middleboxes strip the Range header and
    // return the full file as 200. Historically this was a hard error; now
    // we clear the progress marker and consume the 200 body as a fresh download.
    opfs.store.set("/a.onnx", new Uint8Array([9, 9]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: 2, expectedSize: 5 }))
        .slice().buffer,
    );

    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3, 4, 5]), {
        status: 200,
        headers: { "content-length": "5" },
      }),
    ) as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
    });

    // File contains fresh content, not appended to the old 9,9.
    expect(new Uint8Array(opfs.store.get("/a.onnx")!)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    );
    // Progress marker cleared after successful restart.
    expect(opfs.store.has("/a.onnx._progress.json")).toBe(false);
  });

  it("throws and writes a short-progress marker when server delivers fewer bytes than expected", async () => {
    // Covers the `if (bytesWritten !== expectedSize)` block at the bottom of
    // resumableDownload — a truncated response must throw AND leave a progress
    // marker so the next attempt resumes from where bytes actually landed.
    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-length": "3" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 5,
      }),
    ).rejects.toThrow(/size mismatch/i);

    const progressJson = new TextDecoder().decode(
      opfs.store.get("/a.onnx._progress.json")!,
    );
    expect(JSON.parse(progressJson).bytesWritten).toBe(3);
  });

  it("throws 'No response body' when response.body is null", async () => {
    // Covers the `if (!reader)` branch that prevents a silent empty-write.
    globalThis.fetch = vi.fn(async () =>
      new Response(null, {
        status: 200,
        headers: { "content-length": "0" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 5,
      }),
    ).rejects.toThrow(/no response body/i);
  });

  it("ignores stale progress marker when expectedSize changed", async () => {
    // Targets `prior.expectedSize === expectedSize` — if the manifest bumped
    // the expected size, the old progress marker must be discarded so we
    // don't try to Range-resume from a byte offset that no longer makes sense.
    opfs.store.set("/a.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: 3, expectedSize: 99 }))
        .slice().buffer,
    );

    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      // No Range header should be sent — stale marker is discarded.
      expect(new Headers(init?.headers).get("range")).toBeNull();
      return new Response(new Uint8Array([10, 20, 30, 40, 50]), {
        status: 200,
        headers: { "content-length": "5" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
    });

    expect(new Uint8Array(opfs.store.get("/a.onnx")!)).toEqual(
      new Uint8Array([10, 20, 30, 40, 50]),
    );
  });

  it("does not send Range header on a fresh download (resumeFrom=0)", async () => {
    // Targets the `if (resumeFrom > 0)` boundary mutants — mutating to
    // `true` or `>= 0` would send Range on the first attempt, which many
    // CDNs reject as malformed.
    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("range")).toBeNull();
      return new Response(new Uint8Array([1, 2]), {
        status: 200,
        headers: { "content-length": "2" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores progress marker with non-numeric bytesWritten", async () => {
    // readProgress validates `typeof parsed.bytesWritten === "number"` —
    // a malformed marker (tampered or partially-written JSON) must be
    // treated as absent so we start fresh rather than resume from NaN.
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: "three", expectedSize: 5 }))
        .slice().buffer,
    );
    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("range")).toBeNull();
      return new Response(new Uint8Array([1, 2, 3, 4, 5]), {
        status: 200,
        headers: { "content-length": "5" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the progress marker after a successful download", async () => {
    // Targets clearProgress() try/catch + the filename + PROGRESS_SUFFIX path.
    // A leftover marker would make subsequent downloads attempt a bogus Range
    // request (bytesWritten === expectedSize) and hit the non-206 guard.
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: 2, expectedSize: 5 }))
        .slice().buffer,
    );
    opfs.store.set("/a.onnx", new Uint8Array([9, 9]).buffer);

    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 206,
        headers: { "content-length": "3", "content-range": "bytes 2-4/5" },
      }),
    ) as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
    });

    expect(opfs.store.has("/a.onnx._progress.json")).toBe(false);
  });

  it("ignores an empty progress marker file", async () => {
    // readProgress's `if (file.size === 0) return null` branch — a zero-byte
    // progress file (power loss during write) must not be treated as valid.
    opfs.store.set("/a.onnx._progress.json", new ArrayBuffer(0));
    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("range")).toBeNull();
      return new Response(new Uint8Array([1, 2]), {
        status: 200,
        headers: { "content-length": "2" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts mid-download and leaves progress marker for next run", async () => {
    const controller = new AbortController();
    const body = new ReadableStream({
      async start(c) {
        c.enqueue(new Uint8Array([1, 2]));
        controller.abort();
      },
    });
    globalThis.fetch = vi.fn(async () =>
      new Response(body, { status: 200, headers: { "content-length": "5" } }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 5,
        signal: controller.signal,
      }),
    ).rejects.toThrow(/abort/i);

    const progressJson = new TextDecoder().decode(opfs.store.get("/a.onnx._progress.json")!);
    expect(JSON.parse(progressJson).bytesWritten).toBe(2);
  });
});
