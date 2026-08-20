import type { ApiError, ProgressError } from "../api-client";
import { messageFor } from "./api-errors";

const ALL: readonly ProgressError[] = [
  "NOT_FOUND",
  "PRIVATE_PROFILE",
  "INVALID_STEAM_ID",
  "NOT_CONFIGURED",
  "UNAVAILABLE",
  "NOT_LOADED",
];

describe("messageFor", () => {
  it("has something to say about every failure", () => {
    ALL.forEach((error) => {
      expect(messageFor(error).length).toBeGreaterThan(0);
    });
  });

  it("tells an unconfigured build apart from a missing profile", () => {
    expect(messageFor("NOT_CONFIGURED")).not.toBe(messageFor("NOT_FOUND"));
  });

  it("names the setting to fix when the build has no steam id", () => {
    expect(messageFor("NOT_CONFIGURED")).toContain("EXPO_PUBLIC_STEAM_ID");
  });

  it("says what a steam id looks like, since a wrong value looks like a network problem", () => {
    expect(messageFor("NOT_CONFIGURED")).toContain("17 digits");
  });

  it("points at the backend when it cannot be reached", () => {
    const error: ApiError = "UNAVAILABLE";
    expect(messageFor(error).toLowerCase()).toContain("backend");
  });
});
