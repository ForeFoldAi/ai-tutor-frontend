import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { ProxyOptions } from "vite";

/** ponytail: backend restart / tab close drops WS — EPIPE is expected in dev */
function backendProxy(extra?: Partial<ProxyOptions>): ProxyOptions {
  return {
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
    ...extra,
    configure: (proxy, options) => {
      extra?.configure?.(proxy, options);
      proxy.on("error", (err) => {
        const code = "code" in err ? String(err.code) : "";
        if (code === "EPIPE" || code === "ECONNRESET") return;
        console.error("[vite] proxy error:", err);
      });
    },
  };
}

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname),
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 KB (1 MB) to suppress warning
  },
  server: {
    port: 3000,
    strictPort: false,
    // ponytail: suffix allows any ngrok subdomain without editing on each restart
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.io", ".ngrok.app"],
    // ponytail: ngrok hits Vite; proxy API/WS to local backend so login works same-origin
    proxy: {
      "/auth": backendProxy(),
      "/search": backendProxy(),
      "/chat": backendProxy(),
      "/chat-voice": backendProxy(),
      "/upload": backendProxy(),
      // ponytail: "/voice" prefix also matches SPA /voice-tutor — use "/voice/" + explicit roots
      "/voice/": backendProxy(),
      "/voice-stream": backendProxy(),
      "/voice-transcribe": backendProxy(),
      "/voice-session-end": backendProxy(),
      "/health": backendProxy(),
      "/api": backendProxy(),
      "/ws": backendProxy({ ws: true }),
      "/rtc": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            const code = "code" in err ? String(err.code) : "";
            if (code === "EPIPE" || code === "ECONNRESET") return;
            console.error("[vite] rtc proxy error:", err);
          });
        },
      },
    },
  },
});
