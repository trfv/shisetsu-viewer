import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode !== "production",
    rollupOptions: {
      output: {
        esModule: true,
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
        },
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash][extname]",
      },
    },
  },
  plugins: [
    react(),
    ...(mode === "analyze"
      ? [
          visualizer({
            open: false,
            filename: "dist/stats.json",
            template: "raw-data",
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ] as PluginOption[],
}));
