/** @jsxImportSource preact */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { OfflineReadinessSection } from "./OfflineReadinessSection";
import { useOfflineStore } from "../../../stores/offlineStore";
import { light } from "../../../theme/tokens";

vi.mock("../../../models/modelsManifest", () => ({
  loadManifest: vi.fn(async () => ({
    version: 1,
    models: {
      tts: {
        baseUrl: "/models/tts/",
        files: [{ name: "a.onnx", size: 10, magic: "onnx" }],
      },
      llm: { baseUrl: "/models/llm/", files: [] },
      stt: { baseUrl: "/models/stt/", files: [] },
    },
  })),
}));

vi.mock("../../../models/offlinePrimer", () => ({
  primeOffline: vi.fn(async function* () {
    yield { type: "model-start", model: "tts" } as const;
    yield {
      type: "download-start",
      model: "tts",
      file: "a.onnx",
      size: 10,
    } as const;
    yield { type: "model-verified", model: "tts", ok: true } as const;
    yield { type: "complete", allOk: true } as const;
  }),
}));

describe("OfflineReadinessSection", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    Object.defineProperty(navigator, "storage", {
      value: { estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })) },
      configurable: true,
      writable: true,
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("shows a 'Prepare for offline' button with accessible label", () => {
    render(<OfflineReadinessSection t={light} />);
    expect(
      screen.getByRole("button", { name: /prepare for offline/i }),
    ).toBeTruthy();
  });

  it("runs the primer when the button is clicked and updates store", async () => {
    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /prepare for offline/i }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe(true);
    });
    await waitFor(() => {
      expect(useOfflineStore.getState().primerRunning).toBe(false);
    });
  });

  it("surfaces storage health info", async () => {
    render(<OfflineReadinessSection t={light} />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Storage:/i);
      expect(text).toMatch(/used/);
    });
  });
});
