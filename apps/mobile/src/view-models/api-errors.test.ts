import { translatorFor } from "../i18n/i18n";
import type { ApiError, ProgressError } from "../api-client";
import { messageFor } from "./api-errors";

const english = translatorFor("en");

const ALL: readonly ProgressError[] = [
  "NOT_FOUND",
  "PRIVATE_PROFILE",
  "INVALID_STEAM_ID",
  "UNAVAILABLE",
  "NOT_LOADED",
];

describe("messageFor", () => {
  it("has something to say about every failure", () => {
    ALL.forEach((error) => {
      expect(messageFor(error, english).length).toBeGreaterThan(0);
    });
  });

  it("points at the backend when it cannot be reached", () => {
    const error: ApiError = "UNAVAILABLE";
    expect(messageFor(error, english).toLowerCase()).toContain("backend");
  });
});
