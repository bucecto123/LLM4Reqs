import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize for production - use esbuild (faster than terser)
    minify: "esbuild",
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react"],
          // Code-split heavy libraries — loaded only when needed
          "mermaid": ["mermaid"],
          "react-flow": ["@xyflow/react"],
          "echo-pusher": ["laravel-echo", "pusher-js"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging (disable in production for smaller size)
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  // Enable compression
  server: {
    compress: true,
    port: 5173,
    proxy: {
      // Proxy all /api/* requests to the backend container
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket (Reverb/Pusher) connections
      '/app': {
        target: 'ws://localhost:8081',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
