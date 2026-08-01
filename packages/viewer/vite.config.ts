import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";

const manualChunks: Record<string, string[]> = {
  "react-vendor": ["react", "react-dom"],
};

// https://vitejs.dev/config/
export default defineConfig(
  ({ mode }): UserConfig => ({
    build: {
      sourcemap: mode !== "production",
      rollupOptions: {
        output: {
          manualChunks(id) {
            for (const [chunkName, deps] of Object.entries(manualChunks)) {
              if (deps.some((dep) => id.includes(`/node_modules/${dep}/`))) {
                return chunkName;
              }
            }
            return undefined;
          },
          chunkFileNames: "assets/[hash].js",
          assetFileNames: "assets/[hash][extname]",
        },
      },
    },
    // cloudflare() は dev server 内で workerd を走らせ、本番と同じランタイムで
    // BFF（worker/index.ts）を検証できるようにする。ビルド出力は dist/client と
    // dist/shisetsu-viewer に分かれる。
    plugins: [react(), cloudflare()],
  })
);
