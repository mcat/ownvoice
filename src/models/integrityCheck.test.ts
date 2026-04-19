import { describe, it, expect, vi } from "vitest";
import { verifyFile, verifyModel, type IntegrityReport } from "./integrityCheck";
import type { ManifestFile, ManifestModel } from "./modelsManifest";

function fakeDir(files: Record<string, Uint8Array>): FileSystemDirectoryHandle {
  return {
    getFileHandle: vi.fn(async (name: string) => {
      if (!(name in files)) throw new DOMException("Not found", "NotFoundError");
      return {
        getFile: async () => new File([files[name]], name),
      } as unknown as FileSystemFileHandle;
    }),
  } as unknown as FileSystemDirectoryHandle;
}

// Header byte for ONNX ModelProto field 1 (ir_version), varint wire type.
// The SECOND byte encodes the actual ir_version value — varies by export.
const ONNX_HEADER_BYTE = 0x08;

describe("verifyFile", () => {
  it.each([
    ["ir_version 7 (Chatterbox)", 0x07],
    ["ir_version 8", 0x08],
    ["ir_version 9 (LFM2)", 0x09],
    ["ir_version 10", 0x0a],
  ])("passes for a real-shape ONNX header: %s", async (_label, irByte) => {
    const bytes = new Uint8Array(100);
    bytes[0] = ONNX_HEADER_BYTE;
    bytes[1] = irByte;
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(true);
  });

  it("fails when size mismatches", async () => {
    const bytes = new Uint8Array(50);
    bytes[0] = ONNX_HEADER_BYTE;
    bytes[1] = 0x07;
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/size/i);
  });

  it("fails when byte 0 is not the ONNX field-1 tag", async () => {
    const bytes = new Uint8Array(100); // all zeros
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/magic/i);
  });

  it("fails when file is an HTML error page masquerading as .onnx", async () => {
    // A caching proxy might return "<!DOCTYPE html>..." when a model URL
    // 404s or captive-portal-redirects. Byte 0 is '<' (0x3C), not 0x08.
    const bytes = new TextEncoder().encode(
      "<!DOCTYPE html><html><body>503</body></html>",
    );
    const padded = new Uint8Array(100);
    padded.set(bytes, 0);
    const dir = fakeDir({ "model.onnx": padded });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/magic/i);
  });

  it("fails when json does not parse", async () => {
    const bytes = new TextEncoder().encode("not valid json");
    const dir = fakeDir({ "tokenizer.json": bytes });
    const spec: ManifestFile = {
      name: "tokenizer.json",
      size: bytes.byteLength,
      magic: "json",
    };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/json/i);
  });

  it("fails when file is missing", async () => {
    const dir = fakeDir({});
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/missing|not found/i);
  });

  it("skips magic check when magic is null", async () => {
    const bytes = new Uint8Array(100);
    const dir = fakeDir({ "weights.onnx_data": bytes });
    const spec: ManifestFile = { name: "weights.onnx_data", size: 100, magic: null };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(true);
  });
});

describe("verifyModel", () => {
  it("reports per-file and overall status", async () => {
    const good = new Uint8Array(10);
    good[0] = ONNX_HEADER_BYTE;
    good[1] = 0x07;
    const dir = fakeDir({ "good.onnx": good, "bad.onnx": new Uint8Array(5) });
    const model: ManifestModel = {
      baseUrl: "/models/x/",
      files: [
        { name: "good.onnx", size: 10, magic: "onnx" },
        { name: "bad.onnx", size: 10, magic: "onnx" },
      ],
    };
    const report: IntegrityReport = await verifyModel(dir, model);
    expect(report.ok).toBe(false);
    expect(report.files.find((f) => f.name === "good.onnx")?.ok).toBe(true);
    expect(report.files.find((f) => f.name === "bad.onnx")?.ok).toBe(false);
  });
});
