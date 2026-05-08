import { describe, it, expect } from "vitest";
import {
  ContentValidationError,
  ONNX_MAGIC_FIRST_BYTE,
  bytesToHex,
  checkFirstByteMagic,
  checkResponseContentType,
} from "./contentValidator";

describe("checkResponseContentType", () => {
  it("returns null when header is absent", () => {
    expect(checkResponseContentType(null)).toBeNull();
  });

  it("returns null for binary content types", () => {
    expect(checkResponseContentType("application/octet-stream")).toBeNull();
    expect(checkResponseContentType("application/json")).toBeNull();
  });

  it("rejects text/html outright", () => {
    const reason = checkResponseContentType("text/html");
    expect(reason).toMatch(/text\/html/i);
  });

  it("rejects text/html with charset suffix and case variations", () => {
    expect(checkResponseContentType("text/html; charset=utf-8")).toMatch(/text\/html/i);
    expect(checkResponseContentType("TEXT/HTML")).toMatch(/text\/html/i);
  });
});

describe("checkFirstByteMagic", () => {
  it("accepts the ONNX field-1 tag", () => {
    expect(checkFirstByteMagic("onnx", ONNX_MAGIC_FIRST_BYTE)).toBeNull();
  });

  it("rejects 0x3c (HTML '<') as ONNX", () => {
    const reason = checkFirstByteMagic("onnx", 0x3c);
    expect(reason).toMatch(/onnx/i);
    expect(reason).toMatch(/0x3c/);
  });

  it("rejects zero-padding as ONNX", () => {
    expect(checkFirstByteMagic("onnx", 0x00)).toMatch(/onnx/i);
  });

  it("zero-pads single-digit hex bytes in the diagnostic message", () => {
    // The reason string is forwarded into the MODEL_DOWNLOAD_FAILURE audit
    // event for forensics. Single-digit bytes must render as e.g. "0x05",
    // not "0x5", so log greppers can match a fixed-width pattern and humans
    // aren't tripped up by 0x5 vs 0x50 ambiguity.
    expect(checkFirstByteMagic("onnx", 0x05)).toMatch(/0x05/);
  });

  it.each([
    ["object", 0x7b], // {
    ["array", 0x5b],  // [
    ["string", 0x22], // "
    ["true", 0x74],   // t
    ["false", 0x66],  // f
    ["null", 0x6e],   // n
    ["space", 0x20],
    ["tab", 0x09],
    ["LF", 0x0a],
    ["CR", 0x0d],
  ])("accepts JSON starting with %s (0x%s)", (_label, byte) => {
    expect(checkFirstByteMagic("json", byte)).toBeNull();
  });

  it("rejects HTML '<' as JSON", () => {
    expect(checkFirstByteMagic("json", 0x3c)).toMatch(/json/i);
  });

  it("zero-pads single-digit hex bytes in the JSON diagnostic message", () => {
    // Same forensic-formatting rationale as the ONNX case.
    expect(checkFirstByteMagic("json", 0x05)).toMatch(/0x05/);
  });

  it("returns null when magic is null (raw blob, jinja)", () => {
    expect(checkFirstByteMagic(null, 0x00)).toBeNull();
    expect(checkFirstByteMagic(null, 0x3c)).toBeNull();
  });
});

describe("bytesToHex", () => {
  it("hex-encodes up to max bytes", () => {
    expect(bytesToHex(new Uint8Array([0x3c, 0x21, 0x44, 0x4f]))).toBe("3c21444f");
  });

  it("respects the max parameter", () => {
    expect(bytesToHex(new Uint8Array([1, 2, 3, 4, 5]), 3)).toBe("010203");
  });

  it("zero-pads single-digit bytes", () => {
    expect(bytesToHex(new Uint8Array([0x01, 0x0a]))).toBe("010a");
  });
});

describe("ContentValidationError", () => {
  it("carries diagnostic context for the audit trail", () => {
    const err = new ContentValidationError(
      "model.onnx: response was text/html",
      "model.onnx",
      "text/html",
      "3c21444f",
    );
    expect(err.name).toBe("ContentValidationError");
    expect(err.filename).toBe("model.onnx");
    expect(err.contentType).toBe("text/html");
    expect(err.firstBytes).toBe("3c21444f");
    expect(err).toBeInstanceOf(Error);
  });

  it("is discriminable via instanceof from generic Error", () => {
    const err: unknown = new ContentValidationError("x", "f", null, null);
    expect(err instanceof ContentValidationError).toBe(true);
  });
});
