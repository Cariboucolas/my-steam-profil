import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { changedPaths } from "./changed-paths";

let repository: string;

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repository, encoding: "utf8", stdio: "pipe" });

const write = (path: string, text: string) => {
  mkdirSync(dirname(join(repository, path)), { recursive: true });
  writeFileSync(join(repository, path), text);
};

const commit = (message: string) => {
  git("add", "-A");
  git(
    "-c",
    "user.name=test",
    "-c",
    "user.email=",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-q",
    "-m",
    message,
  );
};

beforeEach(() => {
  repository = mkdtempSync(join(tmpdir(), "changed-paths-"));
  git("init", "-q", "-b", "main");
  write("docs/adr/0001-a.md", "a decision\n");
  write("docs/old.md", "doomed\n");
  commit("base");
  git("checkout", "-q", "-b", "change");
});

afterEach(() => rmSync(repository, { recursive: true, force: true }));

describe("changedPaths", () => {
  /** A rename out of a tier-2 directory must not hide where the file came from. */
  it("names both sides of a rename", () => {
    git("mv", "docs/adr/0001-a.md", "docs/a.md");
    commit("rename");

    expect([...changedPaths("main", repository)].sort()).toEqual([
      "docs/a.md",
      "docs/adr/0001-a.md",
    ]);
  });

  it("names a deleted path", () => {
    git("rm", "-q", "docs/old.md");
    commit("delete");

    expect(changedPaths("main", repository)).toEqual(["docs/old.md"]);
  });

  /** base...HEAD: what landed on the base since the branch left it is not the change's. */
  it("leaves out what the base gained after the branch left it", () => {
    write("docs/mine.md", "mine\n");
    commit("mine");
    git("checkout", "-q", "main");
    write("docs/theirs.md", "theirs\n");
    commit("theirs");
    git("checkout", "-q", "change");

    expect(changedPaths("main", repository)).toEqual(["docs/mine.md"]);
  });

  it("refuses a base git does not know, rather than reading it as no change", () => {
    expect(() => changedPaths("no-such-base", repository)).toThrow();
  });
});
