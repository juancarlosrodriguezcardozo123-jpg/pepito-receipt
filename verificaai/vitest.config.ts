import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://verificaai:verificaai@localhost:5432/verificaai_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/fixtures/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    env: { DATABASE_URL: TEST_DB, STORAGE_DIR: "./.test-storage", STORAGE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"), RETENTION_DAYS: "30", NODE_ENV: "test" },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
