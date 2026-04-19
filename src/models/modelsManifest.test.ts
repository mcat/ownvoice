import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadManifest, type ModelsManifest } from "./modelsManifest";

describe("loadManifest", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).endsWith("/models-manifest.json")) {
        return new Response(
          JSON.stringify({
            version: 1,
            models: {
              tts: {
                baseUrl: "/models/tts/",
                files: [{ name: "a.onnx", size: 100, magic: "onnx" }],
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  it("returns a typed manifest", async () => {
    const manifest: ModelsManifest = await loadManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.models.tts.files[0].name).toBe("a.onnx");
  });

  it("rejects unknown version", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ version: 99, models: {} }), { status: 200 }),
    ) as typeof fetch;
    await expect(loadManifest()).rejects.toThrow(/version/i);
  });
});
