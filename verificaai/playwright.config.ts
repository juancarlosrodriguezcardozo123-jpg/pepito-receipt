import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const DB = process.env.E2E_DATABASE_URL ?? "postgresql://verificaai:verificaai@localhost:5432/verificaai_e2e";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-ES",
    trace: "retain-on-failure",
    // Permite usar un Chromium ya instalado (PLAYWRIGHT_CHROMIUM_PATH) en lugar del descargado por Playwright.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { DATABASE_URL: DB, APP_URL: `http://localhost:${PORT}`, STORAGE_DIR: "./.e2e-storage" },
  },
});
