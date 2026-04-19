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

  it("throws if server 200s without Range support on resume", async () => {
    opfs.store.set("/a.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder().encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 }))
        .buffer as ArrayBuffer,
    );
    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3, 4, 5]), {
        status: 200,
        headers: { "content-length": "5" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 5,
      }),
    ).rejects.toThrow(/range|206/i);
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
