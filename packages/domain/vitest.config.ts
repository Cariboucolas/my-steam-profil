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
        "src/index.ts", // barrel: only re-exports
        "src/achievement.ts", // type-only file: no runtime code
        "src/game.ts", // type-only file: no runtime code
        "src/profile.ts", // type-only file: no runtime code
      ],
      // The domain is pure functions with no I/O to stand in the way, so it is
      // held where it already is rather than somewhere short of it.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
