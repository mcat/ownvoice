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

// ONNX magic: 0x08 0x01 (protobuf field 1, varint 1).
const ONNX_HEADER = new Uint8Array([0x08, 0x01]);

describe("verifyFile", () => {
  it("passes when size and magic match", async () => {
    const bytes = new Uint8Array(100);
    bytes.set(ONNX_HEADER, 0);
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(true);
  });

  it("fails when size mismatches", async () => {
    const bytes = new Uint8Array(50);
    bytes.set(ONNX_HEADER, 0);
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/size/i);
  });

  it("fails when onnx magic is wrong", async () => {
    const bytes = new Uint8Array(100); // all zeros — no 0x08 0x01
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/magic/i);
  });

  it("fails when only the first magic byte is wrong", async () => {
    // Exercises head[0] !== ONNX_MAGIC[0] side of the OR independently.
    const bytes = new Uint8Array(100);
    bytes[0] = 0xff;
    bytes[1] = 0x01; // second byte correct
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/magic/i);
  });

  it("fails when only the second magic byte is wrong", async () => {
    // Exercises head[1] !== ONNX_MAGIC[1] side of the OR independently.
    const bytes = new Uint8Array(100);
    bytes[0] = 0x08; // first byte correct
    bytes[1] = 0xff;
    const dir = fakeDir({ "model.onnx": bytes });
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
    good.set(ONNX_HEADER, 0);
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
