import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/runtime",
  workers: 1,
  timeout: 45_000,
  outputDir: "test-results/runtime",
  use: { baseURL: process.env.CLINIC_QA_BASE_URL || "http://localhost:5173" },
});
