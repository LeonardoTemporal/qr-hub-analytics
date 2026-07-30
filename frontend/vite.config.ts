import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8000";
  const internalProxySecret = env.INTERNAL_PROXY_SECRET || "";
  const backendProxy = {
    target: backendTarget,
    changeOrigin: true,
    headers: {
      "X-QRHub-Proxy-Secret": internalProxySecret,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/leaflet")) return "maps";
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
              return "charts";
            }
            if (id.includes("node_modules/gsap") || id.includes("node_modules/lenis")) {
              return "motion";
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": backendProxy,
        "/r": backendProxy,
        "/t": backendProxy,
        "/qr": backendProxy,
      }
    },
    preview: {
      port: 3000,
      proxy: {
        "/api": backendProxy,
        "/r": backendProxy,
        "/t": backendProxy,
        "/qr": backendProxy,
      }
    }
  };
});
