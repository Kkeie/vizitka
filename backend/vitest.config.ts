import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [path.join(__dirname, "test", "setup.ts")],
    fileParallelism: false,
    pool: "forks",
    testTimeout: 30_000,
  },
});
