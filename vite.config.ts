import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode !== "production",
    outDir: "build",
    rollupOptions: {
      external: [
        "/fonts/roboto-v27-latin-regular.woff2",
        "/fonts/roboto-v27-latin-700.woff2",
        "/fonts/noto-sans-jp-v28-latin_japanese-regular.woff2",
        "/fonts/noto-sans-jp-v28-latin_japanese-700.woff2",
      ],
      output: {
        esModule: true,
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@mui/icons-material", "@mui/x-date-pickers"],
        },
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash][extname]",
      }
    }
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    ...(mode === "analyze" ? [
      visualizer(
        {
          open: true,
          filename: "build/stats.html",
          gzipSize: true,
          brotliSize: true,
        }
      )
    ] : []),
  ],
  test: {
    global: true,
    environment: "happy-dom",
  },
}))
