import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Проксируем /api на бэкенд, чтобы фронт и бэк работали в docker-compose без CORS
export default defineConfig({
  plugins: [react()],
  // Base path для GitHub Pages (если репозиторий не в корне, укажите '/repo-name/')
  // Для корневого репозитория или custom domain используйте '/'
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Работает и локально, и в docker-compose
        target: process.env.VITE_BACKEND_URL || "http://localhost:3000",
        changeOrigin: true
      },
      "/uploads": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist",
    // Генерируем source maps для production (опционально)
    sourcemap: false
  }
});
