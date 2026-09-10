import { describe, expect, it } from "vitest";

import { testFilesTheRouterWouldPublish } from "./published-tests";

describe("testFilesTheRouterWouldPublish", () => {
  it("keeps quiet when the router root holds only screens", () => {
    expect(
      testFilesTheRouterWouldPublish(["_layout.tsx", "index.tsx", "game/[appId].tsx"]),
    ).toEqual([]);
  });

  /**
   * The failure this exists for: expo-router publishes the file as a route and
   * the web build stays green, while jest no longer looks in the router root at
   * all — so nothing runs the test and nothing reports the bundle it grew.
   */
  it("names a test file left in the router root", () => {
    expect(
      testFilesTheRouterWouldPublish(["index.tsx", "index.test.tsx", "setup.tsx"]),
    ).toEqual(["index.test.tsx"]);
  });

  it("names one nested under a route segment", () => {
    expect(testFilesTheRouterWouldPublish(["game/[appId].test.tsx"])).toEqual([
      "game/[appId].test.tsx",
    ]);
  });

  /** Vitest and jest both answer to `.spec.`, and so does the router. */
  it("answers to spec as well as test", () => {
    expect(testFilesTheRouterWouldPublish(["index.spec.ts", "index.test.js"])).toEqual([
      "index.spec.ts",
      "index.test.js",
    ]);
  });

  /**
   * A screen may legitimately be named after what it tests without being one.
   * The router publishes `latest.tsx` and nobody should be stopped from writing it.
   */
  it("leaves alone a screen whose name merely contains the word", () => {
    expect(testFilesTheRouterWouldPublish(["latest.tsx", "protest.tsx"])).toEqual([]);
  });
});
