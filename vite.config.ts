import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/arca-ui/" : "/",
  server: {
    port: 5188,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "lenis/react": path.resolve(import.meta.dirname, "./node_modules/lenis/dist/lenis-react.mjs"),
    },
  },
})
