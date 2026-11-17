import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { unpinnedActions } from "./unpinned-actions.ts";

const workflow = (name: string, text: string) => ({ name, text });
const SHA = "9eb012b6d0900c2b9eede65ee1758cec4d2973e9";

const privileged = (uses: string) => `
on:
  pull_request_target:
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: ${uses}
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
`;

describe("unpinnedActions", () => {
  it("keeps quiet about a third-party action pinned to a commit", () => {
    expect(
      unpinnedActions([
        workflow("ai-review.yml", privileged(`anthropics/claude-code-action@${SHA}`)),
      ]),
    ).toEqual([]);
  });

  /** A tag or a branch is moved by whoever owns the action, and the step holds main's secrets. */
  it.each([
    "anthropics/claude-code-action@v1",
    "anthropics/claude-code-action@main",
    `anthropics/claude-code-action@${SHA.slice(0, 7)}`,
    "anthropics/claude-code-action",
  ])("names a third-party action not pinned to a full commit SHA: %s", (uses) => {
    expect(unpinnedActions([workflow("ai-review.yml", privileged(uses))])).toEqual([
      { workflow: "ai-review.yml", problem: `job "review" uses an action no commit pins: ${uses}` },
    ]);
  });

  it("holds a workflow started by workflow_run to the same rule", () => {
    const text = privileged("some/action@v2").replace(
      "on:\n  pull_request_target:",
      "on:\n  workflow_run:\n    workflows: [CI]",
    );

    expect(unpinnedActions([workflow("merge.yml", text)])).toHaveLength(1);
  });

  /** GitHub's own actions follow the repository's tags, as everywhere else. */
  it("leaves GitHub's own actions and local ones to their tags", () => {
    const text = privileged("actions/setup-node@v7").replace(
      "      - uses: actions/checkout@v7",
      "      - uses: ./.github/actions/local\n      - uses: Actions/Checkout@v7",
    );

    expect(unpinnedActions([workflow("x.yml", text)])).toEqual([]);
  });

  it("ignores workflows that run with the pull request's own rights", () => {
    const text = privileged("some/action@v2").replace("pull_request_target:", "pull_request:");

    expect(unpinnedActions([workflow("ci.yml", text)])).toEqual([]);
  });
});

/** The check is only worth its CI step if this repository passes it. */
const WORKFLOWS = fileURLToPath(new URL("../../../.github/workflows", import.meta.url));

describe("this repository's workflows", () => {
  it("pin every third-party action that main's rights run", () => {
    const files = readdirSync(WORKFLOWS)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => workflow(name, readFileSync(join(WORKFLOWS, name), "utf8")));

    expect(unpinnedActions(files)).toEqual([]);
  });
});
