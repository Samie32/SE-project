import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Cổng 5173 là origin duy nhất đăng ký cho Keycloak client `clinic-web`
// (infra/keycloak/realm-template.json). Một ứng dụng duy nhất phục vụ mọi vai trò nên
// không còn xung đột cổng giữa các frontend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    preview: { port: 5173, strictPort: true },
  };
});
