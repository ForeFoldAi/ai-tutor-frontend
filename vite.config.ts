import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
    allowedHosts: [".ngrok-free.app", ".ngrok.io", ".ngrok.app"],
    // ponytail: ngrok hits Vite; proxy API/WS to local backend so login works same-origin
    proxy: {
      "/auth": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/chat": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/chat-voice": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/upload": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/voice": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
    },
  },
});
