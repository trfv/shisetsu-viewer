import { ConfigEnv, defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
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
          "@mui/x-data-grid": ["@mui/x-data-grid"],
          "@mui/icons-material": ["@mui/icons-material"],
          "@mui/lab": ["@mui/lab"],
          "@mui/styles": ["@mui/styles"],
          "markdown-to-jsx": ["markdown-to-jsx"]
        },
        chunkFileNames: mode === "production" ? "assets/[hash].js" : "assets/[name]-[hash].js",
        assetFileNames: mode === "production" ? "assets/[hash][extname]" : "assets/[name]-[hash][extname]",
      }
    }
  },
  plugins: [reactRefresh()],
  esbuild: {
    jsxInject: `import React from "react"`
  },
}))

