import { ConfigEnv, defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  build: {
    sourcemap: mode !== "production",
    outDir: "build",
    rollupOptions: {
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
