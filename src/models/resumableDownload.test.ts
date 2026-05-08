import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { resumableDownload } from "./resumableDownload";
import { ContentValidationError } from "./contentValidator";

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
        // Per OPFS spec, cursor starts at 0 regardless of keepExistingData —
        // callers that want to append must seek() explicitly. Prior mock
        // defaulted to buf.byteLength, which silently hid missing seek() calls.
        let cursor = 0;
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

  it("does not emit the range-fallback warning on a fresh download (resumeFrom=0)", async () => {
    // Guards the `resumeFrom > 0 && response.status !== 206` branch against
    // mutants that would drop the resumeFrom guard and trigger the warn+clear
    // path for every non-206 response, including legitimate fresh downloads.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([1, 2]), {
        status: 200,
        headers: { "content-length": "2" },
      }),
    ) as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 2,
    });

    const warnedAboutRange = warn.mock.calls.some((call) =>
      String(call[0]).includes("Range request"),
    );
    expect(warnedAboutRange).toBe(false);
  });

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

  it("rejects an HTML response before opening OPFS, regardless of magic", async () => {
    // SPA fallback (Vite dev) / captive portal — server returns HTML with 200.
    // Must throw a ContentValidationError carrying the content-type, and must
    // NOT create a file at the target path.
    globalThis.fetch = vi.fn(async () =>
      new Response(new TextEncoder().encode("<!DOCTYPE html>..."), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 100,
        magic: "onnx",
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);

    expect(opfs.store.has("/a.onnx")).toBe(false);
    expect(opfs.store.has("/a.onnx._progress.json")).toBe(false);
  });

  it("attaches diagnostic context to ContentValidationError on HTML response", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(new TextEncoder().encode("<html>"), {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    ) as typeof fetch;

    let caught: unknown;
    try {
      await resumableDownload({
        url: "/models/llm/c.json",
        dir: opfs.root,
        filename: "c.json",
        expectedSize: 50,
        magic: "json",
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ContentValidationError);
    const err = caught as ContentValidationError;
    expect(err.filename).toBe("c.json");
    expect(err.contentType).toBe("text/html");
  });

  it("HTML response wipes a prior partial file so retry starts clean", async () => {
    // Prior partial bytes from an earlier (good) attempt are present, but the
    // current response is HTML (proxy regressed). The issue's recovery
    // contract is "retry starts clean" — partial file and progress marker
    // must both be removed, even though it costs the previously-good bytes.
    opfs.store.set("/a.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: 3, expectedSize: 100 }))
        .slice().buffer,
    );

    globalThis.fetch = vi.fn(async () =>
      new Response(new TextEncoder().encode("<!DOCTYPE html>"), {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 100,
        magic: "onnx",
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);

    expect(opfs.store.has("/a.onnx")).toBe(false);
    expect(opfs.store.has("/a.onnx._progress.json")).toBe(false);
  });

  it("rejects bytes whose first byte fails the ONNX magic check", async () => {
    // Server returns 200 with an acceptable Content-Type (e.g. octet-stream)
    // but the body is HTML — covers misconfigured proxies that don't tag the
    // response as text/html. The first-byte check is the second layer.
    const htmlBody = new TextEncoder().encode("<!DOCTYPE html><html>...</html>");
    globalThis.fetch = vi.fn(async () =>
      new Response(htmlBody, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: htmlBody.byteLength,
        magic: "onnx",
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);

    // Partial file and progress marker must be cleaned up.
    expect(opfs.store.has("/a.onnx")).toBe(false);
    expect(opfs.store.has("/a.onnx._progress.json")).toBe(false);
  });

  it("does not run the magic check on a Range-resumed download", async () => {
    // When resuming, the first byte of the stream is mid-file, not byte 0,
    // so the magic check would falsely reject most resumes. Guard the
    // resumeFrom>0 → skip-magic-check path.
    opfs.store.set("/a.onnx", new Uint8Array([0x08, 1, 2]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 }))
        .slice().buffer,
    );

    // Body for the resume — starts with 0x99, NOT a valid ONNX magic byte.
    // Must not be rejected because we're past byte 0.
    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([0x99, 0xaa]), {
        status: 206,
        headers: {
          "content-type": "application/octet-stream",
          "content-length": "2",
          "content-range": "bytes 3-4/5",
        },
      }),
    ) as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
      magic: "onnx",
    });

    expect(new Uint8Array(opfs.store.get("/a.onnx")!)).toEqual(
      new Uint8Array([0x08, 1, 2, 0x99, 0xaa]),
    );
  });

  it("skips the magic check when no magic is supplied (raw .onnx_data)", async () => {
    // .onnx_data files have magic: null in the manifest — the validator
    // returns no reason for that case. A raw byte stream must not be
    // rejected just because byte 0 isn't a known magic.
    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([0xff, 0xfe, 0xfd]), {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    ) as typeof fetch;

    await resumableDownload({
      url: "/models/tts/weights.onnx_data",
      dir: opfs.root,
      filename: "weights.onnx_data",
      expectedSize: 3,
      magic: null,
    });

    expect(new Uint8Array(opfs.store.get("/weights.onnx_data")!)).toEqual(
      new Uint8Array([0xff, 0xfe, 0xfd]),
    );
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
