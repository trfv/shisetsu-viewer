import { ConfigEnv, defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  build: {
    sourcemap: mode !== "production",
    outDir: "build",
    rollupOptions: {
      output: {
        esModule: true,
        manualChunks: {
          "react": ["react"],
          "react-dom": ["react-dom"],
          "react-router": ["react-router"],
          "react-router-dom": ["react-router-dom"],
          "@auth0/auth0-spa-js": ["@auth0/auth0-spa-js"],
          "graphql": ["graphql"],
          "@apollo/client": ["@apollo/client"],
          "date-fns": ["date-fns"],
          "@emotion/react": ["@emotion/react"],
          "@emotion/styled": ["@emotion/styled"],
          "@mui/material": ["@mui/material"],
          "@mui/icons-material": ["@mui/icons-material"],
          "@mui/lab": ["@mui/lab"],
          "markdown-to-jsx": ["markdown-to-jsx"]
        },
        chunkFileNames: "assets/[hash].js",
        assetFileNames: (info) => info.name.includes("woff") ? "assets/[name][extname]" : "assets/[hash][extname]",
      }
    }
  },
  plugins: [reactRefresh()],
  esbuild: {
    jsxInject: `import React from "react"`
  },
}))

