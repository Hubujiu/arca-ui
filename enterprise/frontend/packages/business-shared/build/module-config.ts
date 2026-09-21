import { defineConfig, loadEnv, normalizePath, type PluginOption, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ClientRequest } from "node:http";

export type EnterpriseModuleConfig = {
  id: "knowledge" | "forms" | "workflow" | "identity" | "authorization";
  port: number;
  moduleRoot: string;
  knowledgeApi?: boolean;
  plugins?: PluginOption[];
};

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const sharedRoot = fileURLToPath(new URL("../", import.meta.url));

function portalProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on("proxyReq", (request: ClientRequest) => request.setHeader("Origin", target));
    },
  };
}

export function createModuleConfig(options: EnterpriseModuleConfig) {
  const root = path.resolve(options.moduleRoot);
  return defineConfig(({ mode }) => {
    const env = loadEnv(mode, root, "ENTERPRISE_");
    const portal = env.ENTERPRISE_PORTAL_API || "http://127.0.0.1:8080";
    const business = env.ENTERPRISE_BUSINESS_API || "http://127.0.0.1:8081";
    const proxy: Record<string, string | ProxyOptions> = options.knowledgeApi
      ? {
          "/api/v1/auth": portalProxy(portal),
          "/api/v1/me/capabilities": portalProxy(portal),
          "/api/v1/me/applications": portalProxy(portal),
          "/api/v1/company": portalProxy(portal),
          "/api": { target: business, changeOrigin: true },
        }
      : { "/api": portalProxy(portal) };
    return {
      plugins: [react(), tailwindcss(), ...(options.plugins || [])],
      resolve: {
        dedupe: ["react", "react-dom", "react-router-dom"],
        alias: {
          "@": normalizePath(path.resolve(sharedRoot, "src")),
          "@enterprise/business-shared": normalizePath(path.resolve(sharedRoot, "src")),
          "@approved/potlab-icons": normalizePath(path.resolve(sharedRoot, "approved/potlab-icons/src/Potlab.tsx")),
          "@approved/popover": normalizePath(path.resolve(sharedRoot, "approved/beui-popover/popover.tsx")),
        },
      },
      server: {
        port: options.port,
        strictPort: true,
        host: "127.0.0.1",
        cors: { origin: ["http://127.0.0.1:5173", "http://localhost:5173"] },
        headers: { "Access-Control-Allow-Credentials": "true" },
        proxy,
      },
      build: {
        emptyOutDir: true,
        sourcemap: true,
        cssCodeSplit: false,
        lib: {
          entry: path.resolve(root, "src/mount.tsx"),
          formats: ["es"],
          fileName: () => "entry.js",
          cssFileName: "style",
        },
        rollupOptions: {
          output: {
            assetFileNames: (asset) => asset.name === "style.css" ? "style.css" : "assets/[name]-[hash][extname]",
            chunkFileNames: "chunks/[name]-[hash].js",
          },
        },
      },
      define: {
        __ENTERPRISE_MODULE_ID__: JSON.stringify(options.id),
        "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
        "process.env": JSON.stringify({ NODE_ENV: mode === "production" ? "production" : "development" }),
      },
    };
  });
}

export const enterpriseWorkspaceRoot = workspaceRoot;
