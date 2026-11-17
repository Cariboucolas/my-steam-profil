import { describe, expect, it } from "vitest";

import { riskTier } from "./risk-tiers.ts";
import { tierReport } from "./tier-report.ts";

describe("tierReport", () => {
  it("names the tier, what decides it and where the paths come from", () => {
    expect(tierReport(riskTier(["README.md", ".github/workflows/ci.yml"]), "pull request #7")).toBe(
      [
        "### Risk tier 2: decided by 1 of 2 changed paths",
        "",
        "Read against the risk tiers of AGENTS.md, from pull request #7.",
        "",
        "- `.github/workflows/ci.yml` — `.github/**`",
      ].join("\n"),
    );
  });

  /** A path is the author's text: a newline in it would start a workflow command of its own. */
  it("keeps a path with a newline on one line", () => {
    const report = tierReport(riskTier(["notes\n::error::x"]), "a branch");

    expect(report.split("\n").at(-1)).toBe("- `notes\\n::error::x` — listed by no tier");
  });

  it("counts the decisive paths beyond thirty rather than listing them", () => {
    const paths = Array.from({ length: 32 }, (_, i) => `docs/${i}.md`);
    const lines = tierReport(riskTier(paths), "a branch").split("\n");

    expect(lines.filter((line) => line.startsWith("- `"))).toHaveLength(30);
    expect(lines.at(-1)).toBe("- and 2 more");
  });
});
