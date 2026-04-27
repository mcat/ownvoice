import { defineConfig } from "vite";
import { resolve } from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    // COOP/COEP make `crossOriginIsolated` true, which is the prerequisite
    // for SharedArrayBuffer — and therefore for multi-threaded WASM in ORT.
    // The conditional decoder runs on single-threaded WASM by default and
    // is ~24× real-time; threading drops that to near-parity. `credentialless`
    // is the lighter COEP variant: it doesn't require CORP on every
    // subresource (we'd otherwise need to add it everywhere) but still
    // gates SharedArrayBuffer. Production parity is provided by sw.js
    // injecting the same headers on cached responses.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  worker: {
    format: "es",
  },
});
