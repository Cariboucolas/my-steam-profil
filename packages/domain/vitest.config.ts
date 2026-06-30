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
      ],
    },
  },
});
