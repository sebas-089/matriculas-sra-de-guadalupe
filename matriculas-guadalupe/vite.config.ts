import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

/**
 * Servidor local de la API (api-server). En Vercel las funciones de `/api`
 * se sirven desde el mismo dominio, por lo que la SPA siempre llama a `/api`.
 */
const apiDevServer = process.env.API_DEV_SERVER ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5000,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: apiDevServer,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5000,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
