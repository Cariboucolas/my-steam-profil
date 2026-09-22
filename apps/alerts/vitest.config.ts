import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      // Set just under what the suite already reaches, so this holds the line
      // rather than certifying it — the same rule apps/api follows.
      thresholds: { statements: 95, branches: 90, functions: 90, lines: 95 },
    },
  },
});
