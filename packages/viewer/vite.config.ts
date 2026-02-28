import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode !== "production",
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
