/**
 * Tests for the R2 streaming helper behind /ort/* and /models/*.
 *
 * parseRangeHeader is the only thing standing between a stale
 * resumableDownload progress marker and a 500 from production model
 * fetches — every branch here maps to a real client state (resume
 * offset, suffix probe, stale marker past EOF, captive-portal garbage).
 */
import { parseRangeHeader, contentTypeForKey, serveR2 } from "./serveR2";

describe("parseRangeHeader", () => {
  const SIZE = 1000;

  it.each([
    ["bytes=0-499", { start: 0, end: 499, length: 500 }],
    ["bytes=500-", { start: 500, end: 999, length: 500 }],
    ["bytes=999-", { start: 999, end: 999, length: 1 }],
    ["bytes=-200", { start: 800, end: 999, length: 200 }],
    // Suffix longer than the object clamps to the whole object.
    ["bytes=-2000", { start: 0, end: 999, length: 1000 }],
    // End past EOF clamps to EOF.
    ["bytes=0-99999", { start: 0, end: 999, length: 1000 }],
    ["  bytes=0-1  ", { start: 0, end: 1, length: 2 }],
  ] as const)("parses %s", (header, expected) => {
    expect(parseRangeHeader(header, SIZE)).toEqual(expected);
  });

  it.each([
    "bytes=1000-",      // start == size (stale progress marker after re-release)
    "bytes=1500-2000",  // start past EOF
  ])("returns 'unsatisfiable' for %s", (header) => {
    expect(parseRangeHeader(header, SIZE)).toBe("unsatisfiable");
  });

  it.each([
    "bytes=-",            // both empty
    "bytes=-0",           // zero-length suffix
    "bytes=500-100",      // end before start
    "0-499",              // missing bytes= prefix
    "bytes=0-499,600-",   // multipart ranges unsupported → ignore
    "bytes=abc-def",
    "",
  ])("returns null (ignore, serve 200) for %j", (header) => {
    expect(parseRangeHeader(header, SIZE)).toBeNull();
  });

  it("treats any range against an empty object as unsatisfiable", () => {
    expect(parseRangeHeader("bytes=0-", 0)).toBe("unsatisfiable");
    expect(parseRangeHeader("bytes=-5", 0)).toBe("unsatisfiable");
  });
});

describe("contentTypeForKey", () => {
  it.each([
    ["models/x/model_q4.onnx", "application/octet-stream"],
    // The LAST dot component must win: "onnx_data", not "data".
    ["models/x/model_q4.onnx_data", "application/octet-stream"],
    ["ort/v1.25.1/ort.webgpu.min.mjs", "application/javascript"],
    ["ort/v1.25.1/ort-wasm-simd-threaded.jsep.wasm", "application/wasm"],
    ["ort/v1.25.1/ort.webgpu.min.mjs.map", "application/json"],
    ["models/x/tokenizer.json", "application/json"],
    ["models/x/LICENSE", "application/octet-stream"],
    ["models/x/MODEL.ONNX", "application/octet-stream"],
  ])("%s → %s", (key, expected) => {
    expect(contentTypeForKey(key)).toBe(expected);
  });
});

describe("serveR2", () => {
  function makeBucket(size = 10) {
    const object = {
      body: "0123456789",
      httpEtag: '"etag-123"',
    };
    return {
      bucket: {
        get: vi.fn(async () => object),
        head: vi.fn(async () => ({ size })),
      },
      object,
    };
  }

  function req(range?: string): Request {
    return new Request("https://example.com/models/x.onnx", {
      headers: range ? { range } : {},
    });
  }

  it("serves 200 with immutable caching and CORP for a rangeless request", async () => {
    const { bucket } = makeBucket();
    const res = await serveR2(bucket as never, "models/x.onnx", req());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
    expect(res.headers.get("ETag")).toBe('"etag-123"');
  });

  it("serves 206 with correct Content-Range for a valid range", async () => {
    const { bucket } = makeBucket(10);
    const res = await serveR2(bucket as never, "models/x.onnx", req("bytes=2-5"));
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(res.headers.get("Content-Length")).toBe("4");
    expect(bucket.get).toHaveBeenCalledWith("models/x.onnx", {
      range: { offset: 2, length: 4 },
    });
  });

  it("serves a clean 416 for a range past EOF (stale resume marker)", async () => {
    const { bucket } = makeBucket(10);
    const res = await serveR2(bucket as never, "models/x.onnx", req("bytes=10-"));
    expect(res.status).toBe(416);
    expect(res.headers.get("Content-Range")).toBe("bytes */10");
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("ignores a malformed Range and serves the full object (RFC 7233 §3.1)", async () => {
    const { bucket } = makeBucket(10);
    const res = await serveR2(bucket as never, "models/x.onnx", req("bytes=9-2"));
    expect(res.status).toBe(200);
  });

  it("404s when the object is missing", async () => {
    const bucket = {
      get: vi.fn(async () => null),
      head: vi.fn(async () => null),
    };
    expect((await serveR2(bucket as never, "models/gone.onnx", req())).status).toBe(404);
    expect(
      (await serveR2(bucket as never, "models/gone.onnx", req("bytes=0-1"))).status,
    ).toBe(404);
  });
});
