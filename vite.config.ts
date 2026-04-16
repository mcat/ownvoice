import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
    // No COOP/COEP — they interfere with SpeechSynthesis and cross-origin
    // assets, and aren't needed (ORT WASM uses numThreads=1, WebGPU path
    // doesn't require SharedArrayBuffer).
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  worker: {
    format: "es",
  },
});
