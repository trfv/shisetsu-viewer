import { ConfigEnv, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
          react: ["react", "react-dom", "react-router", "react-router-dom"],
          mui: ["@mui/material", "@mui/icons-material", "@mui/lab"],
        },
        chunkFileNames: "assets/[hash].js",
        assetFileNames: (info) => info.name.includes("woff") ? "assets/[name][extname]" : "assets/[hash][extname]",
      }
    }
  },
  plugins: [
    react(),
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
}))
