import { defineConfig } from "@playwright/test";
// Quét giao diện ở chế độ giả lập (không cần Keycloak/backend): npm run test:scan
export default defineConfig({
  testDir: "./tests/scan", testMatch: "**/*.spec.ts", workers: 1, timeout: 120000,
  expect: { timeout: 10000 }, reporter: [["list"], ["json", { outputFile: "test-results/scan.json" }]],
  use: { baseURL: "http://127.0.0.1:5175", headless: true, actionTimeout: 10000 },
  webServer: { command: "npx vite --mode mock --host 127.0.0.1 --port 5175 --strictPort", url: "http://127.0.0.1:5175", timeout: 60000 },
});
