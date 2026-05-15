import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamWithProgress } from "./workerStreamingFetch";

/** Build a stubbed Response whose body emits the given chunks, with the
 *  given content-length header. */
function makeResponse(chunks: Uint8Array[], contentLength: number) {
  let i = 0;
  return {
    ok: true,
    headers: { get: () => String(contentLength) },
    body: {
      getReader: () => ({
        read: vi.fn(async () =>
          i < chunks.length
            ? { done: false, value: chunks[i++] }
            : { done: true, value: undefined },
        ),
      }),
    },
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("streamWithProgress", () => {
  it("returns the concatenated bytes in order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        makeResponse(
          [Uint8Array.of(1, 2, 3), Uint8Array.of(4, 5), Uint8Array.of(6)],
          6,
        ),
      ),
    );
    const buf = await streamWithProgress("/x");
    expect(new Uint8Array(buf)).toEqual(Uint8Array.of(1, 2, 3, 4, 5, 6));
  });

  it("emits onProgress(0, total) before any chunk, then once per chunk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        makeResponse(
          [Uint8Array.of(1, 2, 3), Uint8Array.of(4, 5, 6, 7)],
          7,
        ),
      ),
    );
    const events: Array<[number, number]> = [];
    await streamWithProgress("/x", (loaded, total) => events.push([loaded, total]));
    expect(events).toEqual([
      [0, 7], // initial, after headers
      [3, 7],
      [7, 7],
    ]);
  });

  it("omits onProgress without throwing when no callback is given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeResponse([Uint8Array.of(1)], 1)),
    );
    await expect(streamWithProgress("/x")).resolves.toBeDefined();
  });

  it("throws on non-2xx status with the HTTP code in the message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      })),
    );
    await expect(streamWithProgress("/x")).rejects.toThrow(/HTTP 502: Bad Gateway/);
  });

  it("throws when the response has no body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => "0" },
        body: null,
      })),
    );
    await expect(streamWithProgress("/x")).rejects.toThrow(/No response body/);
  });

  it("treats a missing content-length header as total=0 and still emits initial event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => null },
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({ done: false, value: Uint8Array.of(9) })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      })),
    );
    const events: Array<[number, number]> = [];
    await streamWithProgress("/x", (loaded, total) => events.push([loaded, total]));
    expect(events).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });
});
