import type { ManifestFile } from "./modelsManifest";

/**
 * ONNX files are protobuf-serialized as a ModelProto. Field 1 of that message
 * is `ir_version` (a varint int64), so the first byte on the wire is always
 * 0x08 — the protobuf tag for field 1, wire type VARINT (0x08 == (1 << 3) | 0).
 */
export const ONNX_MAGIC_FIRST_BYTE = 0x08;

/**
 * Bytes that may legally appear at the start of a JSON document. Our shipped
 * JSON (manifest, tokenizer, config) is always an object or array, but accept
 * the broader set so a future top-level scalar isn't a false negative.
 *   { [ "  → object / array / string
 *   t f n  → true / false / null
 *   space tab LF CR  → leading whitespace
 */
const JSON_FIRST_BYTES: ReadonlySet<number> = new Set([
  0x7b, 0x5b, 0x22,
  0x74, 0x66, 0x6e,
  0x20, 0x09, 0x0a, 0x0d,
]);

/**
 * Thrown when a downloaded response fails one of the cheap pre-write checks.
 * Carries the diagnostic context the audit logger and UI both need:
 *   - `filename` so the UI can name the file in the recovery hint
 *   - `contentType` so the user can see "text/html" was returned
 *   - `firstBytes` (hex string of first 16 bytes) for log forensics
 *
 * Marked typed so callers can `instanceof`-discriminate it from generic
 * network errors and surface a distinct "wrong-content" error path.
 */
export class ContentValidationError extends Error {
  override readonly name = "ContentValidationError";
  constructor(
    message: string,
    readonly filename: string,
    readonly contentType: string | null,
    readonly firstBytes: string | null,
  ) {
    super(message);
  }
}

/**
 * Sanity-check the response Content-Type. Model files (ONNX, ONNX external
 * data, JSON, Jinja templates) are never served as `text/html` — if they
 * are, we hit a captive portal, an SPA fallback (Vite dev server returning
 * `index.html` for a missing model path), or an auth redirect.
 *
 * Returns null if the header is absent or plausibly correct, otherwise a
 * human-readable reason string.
 */
export function checkResponseContentType(
  contentType: string | null,
): string | null {
  if (!contentType) return null;
  const lower = contentType.toLowerCase();
  if (lower.includes("text/html")) {
    return `response was ${contentType} (expected binary or JSON)`;
  }
  return null;
}

/**
 * Sanity-check the first byte of the streamed body against the file's magic.
 * Only meaningful at the very start of a file — callers must skip this when
 * appending a `Range:` continuation, since the first byte received is then
 * mid-file and unrelated to the magic.
 *
 * Returns null if ok or if the file type has no magic to check (raw weight
 * blobs, Jinja templates).
 */
export function checkFirstByteMagic(
  magic: ManifestFile["magic"],
  firstByte: number,
): string | null {
  if (magic === "onnx") {
    if (firstByte !== ONNX_MAGIC_FIRST_BYTE) {
      return `expected ONNX magic 0x08, got 0x${firstByte.toString(16).padStart(2, "0")}`;
    }
  } else if (magic === "json") {
    if (!JSON_FIRST_BYTES.has(firstByte)) {
      return `expected JSON start byte, got 0x${firstByte.toString(16).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Hex-encode up to `max` bytes — used to populate `ContentValidationError.firstBytes`. */
export function bytesToHex(bytes: Uint8Array, max = 16): string {
  const n = Math.min(bytes.byteLength, max);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
