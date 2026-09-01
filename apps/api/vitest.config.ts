import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts", // the tests themselves
        "src/steam/steam-types.ts", // type-only file: no runtime code
        "src/server.ts", // composition root: importing it starts a server
      ],
      // Set just under what the suite already reaches, so this holds the line
      // rather than certifying it.
      thresholds: {
        statements: 99,
        branches: 93,
        functions: 97,
        lines: 99,
      },
    },
  },
});
