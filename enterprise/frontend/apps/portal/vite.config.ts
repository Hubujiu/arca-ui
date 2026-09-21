import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const platformProxy = {
  target: "http://127.0.0.1:8080",
  changeOrigin: true,
  configure(proxy: { on(event: "proxyReq", listener: (request: { setHeader(name: string, value: string): void }) => void): void }) {
    proxy.on("proxyReq", request => request.setHeader("Origin", "http://127.0.0.1:8080"));
  },
};

export default defineConfig({
  plugins: [react()],
  publicDir: fileURLToPath(new URL("../../packages/business-shared/public", import.meta.url)),
  server: {
    port: 5173,
    proxy: {
      "/api/v1/auth": platformProxy,
      "/api/v1/authz": platformProxy,
      "/api/v1/platform": platformProxy,
      "/api/v1/company": platformProxy,
      "/api/v1/me/capabilities": platformProxy,
      "/api/v1/me/applications": platformProxy,
      "/api": { target: "http://127.0.0.1:8081", changeOrigin: true },
    },
  },
  resolve: { dedupe: ["react", "react-dom"] },
});
