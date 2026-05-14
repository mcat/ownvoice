/// <reference types="@cloudflare/workers-types" />

/**
 * Shared R2 streaming helper for `/ort/*` and `/models/*` Pages
 * Functions.
 *
 * Parses the `Range` header in-process rather than relying on
 * `R2Object.range`, whose shape varies (offset-only, length-only, suffix,
 * or a mix) and produced `Content-Range: bytes NaN-…/…` in production.
 *
 * Also turns an unsatisfiable Range (start past EOF — what stale
 * resumable-download progress markers produced after a manifest size
 * change) into a clean 416 instead of a 500.
 */

interface ParsedRange {
  start: number;
  end: number;
  length: number;
}

function parseRangeHeader(
  header: string,
  size: number,
): ParsedRange | "unsatisfiable" | null {
  const match = /^\s*bytes=(\d*)-(\d*)\s*$/.exec(header);
  if (!match) return null;
  const [, startStr, endStr] = match;

  if (startStr === "" && endStr === "") return null;

  if (startStr === "") {
    const suffix = parseInt(endStr, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    if (size === 0) return "unsatisfiable";
    const length = Math.min(suffix, size);
    return { start: size - length, end: size - 1, length };
  }

  const start = parseInt(startStr, 10);
  if (!Number.isFinite(start) || start < 0) return null;
  if (start >= size) return "unsatisfiable";

  const end = endStr === "" ? size - 1 : Math.min(parseInt(endStr, 10), size - 1);
  if (!Number.isFinite(end) || end < start) return null;
  return { start, end, length: end - start + 1 };
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  wasm: "application/wasm",
  mjs: "application/javascript",
  js: "application/javascript",
  json: "application/json",
  // Source maps are JSON. Without this, Safari's Web Inspector logs noisy
  // "Source Map loading errors" because the bundled ORT .mjs files carry
  // a `//# sourceMappingURL=...map` trailer and the inspector tries to
  // resolve them on every stack trace.
  map: "application/json",
  jinja: "text/plain; charset=utf-8",
  // ONNX model files: not a registered MIME type. octet-stream forces the
  // browser to treat as binary so streaming/range fetches don't text-decode.
  onnx: "application/octet-stream",
  onnx_data: "application/octet-stream",
};

export function contentTypeForKey(key: string): string {
  // Match the LAST dot-separated component to handle names like
  // "model_q4.onnx_data" (extension is "onnx_data", not "data").
  const m = key.match(/\.([^./]+)$/);
  const ext = m?.[1]?.toLowerCase();
  return (ext && CONTENT_TYPE_BY_EXT[ext]) || "application/octet-stream";
}

const BASE_HEADERS = (contentType: string, etag: string): Record<string, string> => ({
  "Content-Type": contentType,
  "Cache-Control": "public, max-age=31536000, immutable",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Accept-Ranges": "bytes",
  "ETag": etag,
});

export async function serveR2(
  bucket: R2Bucket,
  key: string,
  request: Request,
): Promise<Response> {
  const contentType = contentTypeForKey(key);
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    const object = await bucket.get(key);
    if (!object) return new Response(`R2 object not found: ${key}`, { status: 404 });
    return new Response(object.body, { headers: BASE_HEADERS(contentType, object.httpEtag) });
  }

  const head = await bucket.head(key);
  if (!head) return new Response(`R2 object not found: ${key}`, { status: 404 });

  const parsed = parseRangeHeader(rangeHeader, head.size);

  if (parsed === "unsatisfiable") {
    return new Response("Requested range not satisfiable", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${head.size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  if (parsed === null) {
    // Malformed Range — RFC 7233 §3.1 says servers MAY ignore. Fall back to 200.
    const object = await bucket.get(key);
    if (!object) return new Response(`R2 object not found: ${key}`, { status: 404 });
    return new Response(object.body, { headers: BASE_HEADERS(contentType, object.httpEtag) });
  }

  const object = await bucket.get(key, {
    range: { offset: parsed.start, length: parsed.length },
  });
  if (!object) return new Response(`R2 object not found: ${key}`, { status: 404 });

  return new Response(object.body, {
    status: 206,
    headers: {
      ...BASE_HEADERS(contentType, object.httpEtag),
      "Content-Range": `bytes ${parsed.start}-${parsed.end}/${head.size}`,
      "Content-Length": String(parsed.length),
    },
  });
}
