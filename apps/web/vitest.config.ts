import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: true,
        singleFork: true,
      },
    },
    testTimeout: 30_000,
  },
});
