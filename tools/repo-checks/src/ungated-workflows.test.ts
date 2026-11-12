import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ungatedWorkflows } from "./ungated-workflows";

const workflow = (name: string, text: string) => ({ name, text });

/** What deploy.yml does since #202: CI first, everything else behind it. */
const GATED = `
on:
  push:
    branches: [main]
jobs:
  ci:
    uses: ./.github/workflows/ci.yml
  api:
    needs: ci
    runs-on: ubuntu-latest
    steps: [{ run: deploy }]
  web:
    needs: api
    runs-on: ubuntu-latest
    steps: [{ run: deploy }]
  release:
    needs: [api, web]
    runs-on: ubuntu-latest
    steps: [{ run: release }]
`;

describe("ungatedWorkflows", () => {
  it("keeps quiet when every job waits on CI, directly or through a job that does", () => {
    expect(ungatedWorkflows([workflow("deploy.yml", GATED)])).toEqual([]);
  });

  /**
   * The failure this exists for: on 2026-10-06 a publication ran beside CI
   * rather than behind it, and a red main still went out.
   */
  it("names a workflow on main that publishes without calling CI at all", () => {
    const faulty = workflow(
      "deploy.yml",
      `
on:
  push:
    branches: [main]
jobs:
  api:
    runs-on: ubuntu-latest
    steps: [{ run: deploy }]
`,
    );

    expect(ungatedWorkflows([faulty])).toEqual([
      { workflow: "deploy.yml", problem: "no job calls ./.github/workflows/ci.yml" },
    ]);
  });

  it("names a job that calls nothing it waits on", () => {
    const faulty = workflow(
      "deploy.yml",
      `${GATED}
  gallery:
    runs-on: ubuntu-latest
    steps: [{ run: deploy }]
`,
    );

    expect(ungatedWorkflows([faulty])).toEqual([
      { workflow: "deploy.yml", problem: 'job "gallery" does not wait on CI' },
    ]);
  });

  /** A status function replaces the implicit success(): the job runs after a red CI. */
  it("names a job that waits on CI but runs whatever CI said", () => {
    const faulty = workflow(
      "deploy.yml",
      `${GATED}
  notify:
    needs: ci
    if: always()
    runs-on: ubuntu-latest
    steps: [{ run: notify }]
`,
    );

    expect(ungatedWorkflows([faulty])).toEqual([
      { workflow: "deploy.yml", problem: 'job "notify" runs even when CI fails: if: always()' },
    ]);
  });

  it("reads every way a push to main can be written", () => {
    const ungated = (on: string) =>
      workflow("w.yml", `on: ${on}\njobs:\n  go:\n    runs-on: ubuntu-latest\n    steps: []\n`);

    for (const on of [
      "push",
      "[push, pull_request]",
      "{ push: {} }",
      "{ push: { branches: ['**'] } }",
    ]) {
      expect(ungatedWorkflows([ungated(on)])).toHaveLength(1);
    }
  });

  it("leaves alone what never runs on a push to main", () => {
    const elsewhere = (on: string) =>
      workflow("w.yml", `on: ${on}\njobs:\n  go:\n    runs-on: ubuntu-latest\n    steps: []\n`);

    for (const on of [
      "pull_request",
      "{ schedule: [{ cron: '7 * * * *' }], workflow_dispatch: {} }",
      "{ push: { branches: [release] } }",
      "{ push: { tags: ['v*'] } }",
      "{ push: { branches-ignore: [main] } }",
    ]) {
      expect(ungatedWorkflows([elsewhere(on)])).toEqual([]);
    }
  });

  it("leaves alone CI itself, which is the gate rather than behind it", () => {
    const ci = workflow("ci.yml", "on: [push]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n");

    expect(ungatedWorkflows([ci])).toEqual([]);
  });

  /** The check is worth nothing if the workflows it guards would fail it. */
  it("passes this repository's own workflows", () => {
    const directory = fileURLToPath(new URL("../../../.github/workflows", import.meta.url));
    const own = readdirSync(directory)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => workflow(name, readFileSync(join(directory, name), "utf8")));

    expect(own.length).toBeGreaterThan(0);
    expect(ungatedWorkflows(own)).toEqual([]);
  });
});
