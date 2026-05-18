import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": backendTarget,
        "/r": backendTarget,
        "/t": backendTarget,
        "/qr": backendTarget
      }
    },
    preview: {
      port: 3000,
      proxy: {
        "/api": backendTarget,
        "/r": backendTarget,
        "/t": backendTarget,
        "/qr": backendTarget
      }
    }
  };
});
