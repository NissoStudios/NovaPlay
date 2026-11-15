import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 30_000,
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: true,
        singleFork: true,
      },
    },
    testTimeout: 60_000,
  },
});
