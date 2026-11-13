import { execFileSync } from "node:child_process";

/**
 * Every path a change touches since it left `base`: `base...HEAD`, so what the
 * base gained meanwhile is not counted. `--no-renames` reports a rename as a
 * deletion and an addition, so the tier sees both names; a deletion is a path
 * like any other. An unknown base throws rather than reading as no change.
 */
export const changedPaths = (base: string, cwd: string): readonly string[] =>
  execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", `${base}...HEAD`], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split("\0")
    .filter((path) => path !== "");
