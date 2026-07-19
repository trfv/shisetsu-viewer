import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

const manualChunks: Record<string, string[]> = {
  "react-vendor": ["react", "react-dom"],
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => ({
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
  plugins: [react()],
}));
