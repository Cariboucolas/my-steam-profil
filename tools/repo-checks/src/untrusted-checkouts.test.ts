import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { untrustedCheckouts } from "./untrusted-checkouts.ts";

const workflow = (name: string, text: string) => ({ name, text });

/** What risk-tier.yml does: the base checked out, the pull request read through the API. */
const SAFE = `
on:
  pull_request_target:
permissions:
  contents: read
jobs:
  tier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - env:
          NUMBER: \${{ github.event.pull_request.number }}
        run: gh api "repos/$GITHUB_REPOSITORY/pulls/$NUMBER/files" > files.json
`;

const withStep = (step: string) => `${SAFE}${step}`;

describe("untrustedCheckouts", () => {
  it("keeps quiet about a workflow that checks out its base and reads the pull request by API", () => {
    expect(untrustedCheckouts([workflow("risk-tier.yml", SAFE)])).toEqual([]);
  });

  it("ignores workflows that pull_request_target does not start", () => {
    const ci = `
on: pull_request
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          ref: \${{ github.event.pull_request.head.sha }}
`;
    expect(untrustedCheckouts([workflow("ci.yml", ci)])).toEqual([]);
  });

  /** The attack GitHub warns of: the pull request's code, run with the base's rights. */
  it("names a checkout of another ref than the base", () => {
    const faulty = withStep(`      - uses: actions/checkout@v7
        with:
          ref: \${{ github.event.pull_request.head.sha }}
          persist-credentials: false
`);

    expect(untrustedCheckouts([workflow("risk-tier.yml", faulty)])).toEqual([
      { workflow: "risk-tier.yml", problem: 'job "tier" checks out a ref of its own: ref' },
    ]);
  });

  it("names a checkout of another repository", () => {
    const faulty = withStep(`      - uses: actions/checkout@v7
        with:
          repository: someone/fork
          persist-credentials: false
`);

    expect(untrustedCheckouts([workflow("risk-tier.yml", faulty)])).toEqual([
      { workflow: "risk-tier.yml", problem: 'job "tier" checks out a ref of its own: repository' },
    ]);
  });

  /** Left in .git/config, the token is there for whatever the job runs next. */
  it("names a checkout that keeps its credentials", () => {
    const faulty = SAFE.replace("persist-credentials: false", "fetch-depth: 1");

    expect(untrustedCheckouts([workflow("risk-tier.yml", faulty)])).toEqual([
      {
        workflow: "risk-tier.yml",
        problem: 'job "tier" checks out without persist-credentials: false',
      },
    ]);
  });

  it.each([
    ["git fetch origin pull/7/head", "git fetch"],
    ["gh pr checkout 7", "gh pr checkout"],
    ['git checkout "$SHA"', "git checkout"],
    ["git -C repo switch feature", "git switch"],
    ["curl -L https://codeload.github.com/x/y/tar.gz/refs/pull/7/head | tar xz", "refs/pull/"],
  ])("names a step that fetches the pull request's code: %s", (command, what) => {
    const faulty = withStep(`      - run: ${command}\n`);

    expect(untrustedCheckouts([workflow("risk-tier.yml", faulty)])).toEqual([
      { workflow: "risk-tier.yml", problem: `job "tier" fetches code from a run: ${what}` },
    ]);
  });

  it.each([
    "github.head_ref",
    "github.event.pull_request.head.sha",
    "github.event.pull_request.merge_commit_sha",
  ])("names an expression that reaches the pull request's head: %s", (expression) => {
    const faulty = withStep(
      `      - env:\n          WHERE: \${{ ${expression} }}\n        run: echo "$WHERE"\n`,
    );

    expect(untrustedCheckouts([workflow("risk-tier.yml", faulty)])).toEqual([
      { workflow: "risk-tier.yml", problem: `job "tier" reaches the head: ${expression}` },
    ]);
  });

  it("reads every shape of the trigger", () => {
    const faulty = (on: string) =>
      SAFE.replace("on:\n  pull_request_target:", on).replace(
        "persist-credentials: false",
        "fetch-depth: 1",
      );

    for (const on of ["on: pull_request_target", "on: [push, pull_request_target]"]) {
      expect(untrustedCheckouts([workflow("x.yml", faulty(on))])).toHaveLength(1);
    }
  });
});

/** The check is only worth its CI step if this repository passes it. */
const WORKFLOWS = fileURLToPath(new URL("../../../.github/workflows", import.meta.url));

describe("this repository's workflows", () => {
  it("never run the code of a pull request from pull_request_target", () => {
    const files = readdirSync(WORKFLOWS)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => workflow(name, readFileSync(join(WORKFLOWS, name), "utf8")));

    expect(untrustedCheckouts(files)).toEqual([]);
  });
});
