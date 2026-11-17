import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { LISTED_NOWHERE, riskTier, TIERS } from "./risk-tiers";

describe("riskTier", () => {
  it("reads prose outside the guardrails as tier 0", () => {
    expect(riskTier(["README.md", "docs/stats-page.md"])).toEqual({
      tier: 0,
      paths: [
        { path: "README.md", tier: 0, rule: "README.md" },
        { path: "docs/stats-page.md", tier: 0, rule: "docs/**" },
      ],
    });
  });

  it("reads application code as tier 1", () => {
    expect(riskTier(["apps/mobile/src/components/atoms/Chip.tsx"]).tier).toBe(1);
  });

  /** `docs/**` is tier 0 and `docs/adr/**` tier 2: the higher one decides. */
  it("gives a path the highest tier of every rule that lists it", () => {
    expect(riskTier(["docs/adr/0028-x.md", "apps/api/wrangler.jsonc"]).paths).toEqual([
      { path: "docs/adr/0028-x.md", tier: 2, rule: "docs/adr/**" },
      { path: "apps/api/wrangler.jsonc", tier: 2, rule: "apps/*/wrangler.jsonc" },
    ]);
  });

  it("gives a change the highest tier of any path it touches", () => {
    expect(
      riskTier(["README.md", "packages/domain/src/a.ts", ".github/workflows/ci.yml"]).tier,
    ).toBe(2);
  });

  it("reads a path no tier lists as tier 2", () => {
    expect(riskTier(["notes.txt", ".gitignore"]).paths).toEqual([
      { path: "notes.txt", tier: 2, rule: LISTED_NOWHERE },
      { path: ".gitignore", tier: 2, rule: LISTED_NOWHERE },
    ]);
  });

  /** A devDependency bump is not read for its content: its lockfile alone makes it tier 2. */
  it("reads the lockfile and the app's manifest as tier 2", () => {
    expect(
      riskTier(["pnpm-lock.yaml", "apps/mobile/package.json"]).paths.map((one) => one.tier),
    ).toEqual([2, 2]);
  });

  /**
   * What a Dependabot pull request touches: its CI runs without the
   * repository's secrets, so the owner must read it (ADR-0031).
   */
  it.each([
    [["pnpm-lock.yaml", "package.json"]],
    [["pnpm-lock.yaml", "packages/domain/package.json"]],
    [["pnpm-lock.yaml", "apps/api/package.json", "tools/repo-checks/package.json"]],
    [[".github/workflows/ci.yml", ".github/workflows/deploy.yml"]],
    [[".github/dependabot.yml"]],
  ])("reads a dependency update as tier 2: %j", (paths) => {
    expect(riskTier(paths).tier).toBe(2);
  });

  it("reads nothing changed as tier 0", () => {
    expect(riskTier([])).toEqual({ tier: 0, paths: [] });
  });

  describe("globs", () => {
    it("lets `**/` match at the root and at any depth", () => {
      expect(
        riskTier(["CLAUDE.md", "apps/mobile/AGENTS.md", ".claude/settings.json"]).paths.map(
          (one) => one.rule,
        ),
      ).toEqual(["**/CLAUDE.md", "**/AGENTS.md", "**/.claude/**"]);
    });

    it("keeps `*` inside one segment", () => {
      expect(
        riskTier(["apps/api/src/worker.ts", "apps/api/src/http/worker.ts"]).paths.map(
          (one) => one.tier,
        ),
      ).toEqual([2, 1]);
    });

    it("matches files whose name starts with a dot", () => {
      expect(riskTier(["apps/mobile/.storybook/main.ts"]).paths[0]).toEqual({
        path: "apps/mobile/.storybook/main.ts",
        tier: 1,
        rule: "apps/**",
      });
    });

    it("does not read a dot in a glob as any character", () => {
      expect(riskTier(["READMEXmd"]).tier).toBe(2);
      expect(riskTier(["READMEXmd"]).paths[0]?.rule).toBe(LISTED_NOWHERE);
    });

    /**
     * On a case-insensitive disk, as macOS has by default, `docs/ADR/x.md` is
     * written into `docs/adr/`: a tier 2 path spelled otherwise is still tier 2.
     */
    it("matches whatever the case", () => {
      expect(
        riskTier([
          "docs/ADR/0031-x.md",
          "docs/Agents/x.md",
          "Agents.md",
          ".GitHub/x.yml",
        ]).paths.map((one) => one.tier),
      ).toEqual([2, 2, 2, 2]);
    });

    it("does not let a glob match a prefix of a longer name", () => {
      expect(riskTier(["package.json.bak"]).paths[0]?.rule).toBe(LISTED_NOWHERE);
    });
  });
});

/**
 * The table in AGENTS.md is what a reader trusts, the code is what CI runs:
 * each tier lists, in backquotes inside its bullets, exactly the globs the code holds.
 */
const AGENTS_MD = fileURLToPath(new URL("../../../AGENTS.md", import.meta.url));

const globsInTable = (markdown: string): Record<number, readonly string[]> => {
  const section = markdown.split(/^## Risk tiers$/m)[1]?.split(/^## /m)[0] ?? "";
  const tiers = section.split(/^\*\*Tier (\d):/m).slice(1);
  const found: Record<number, readonly string[]> = {};

  for (let i = 0; i < tiers.length; i += 2) {
    const bullets = (tiers[i + 1] ?? "").split(/^- /m).slice(1);
    // A bullet ends at the first line that is neither indented nor another bullet.
    const listed = bullets.map((bullet) => bullet.split(/\n(?! )/)[0] ?? "").join("\n");
    found[Number(tiers[i])] = [...listed.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
  }

  return found;
};

describe("the risk tiers table in AGENTS.md", () => {
  const table = globsInTable(readFileSync(AGENTS_MD, "utf8"));

  it("lists the three tiers", () => {
    expect(Object.keys(table).sort()).toEqual(["0", "1", "2"]);
  });

  it.each(TIERS.map((one) => [one.tier, one.globs] as const))(
    "holds the globs the code gives tier %i, no more and no fewer",
    (tier, globs) => {
      expect([...(table[tier] ?? [])].sort()).toEqual([...globs].sort());
    },
  );
});

/**
 * What AGENTS.md cites, an agent reads and follows: rewriting it rewrites the
 * rules, so the owner reads it before merge (ADR-0030). Its relative links,
 * and the Markdown files it names in backquotes, are read outside the risk
 * tiers section, whose backquotes are globs. A document cited with no rule
 * that makes it tier 2 fails here.
 */
const citedIn = (markdown: string): readonly string[] => {
  const prose = markdown.replace(/^## Risk tiers$[\s\S]*?(?=^## )/m, "");
  const links = [...prose.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)]
    .map((match) => match[1] ?? "")
    .filter((target) => !/^[a-z]+:/i.test(target));
  const named = [...prose.matchAll(/`([^`\s]+\.md)`/g)].map((match) => match[1] ?? "");
  return [...new Set([...links, ...named])];
};

describe("what AGENTS.md cites", () => {
  const cited = citedIn(readFileSync(AGENTS_MD, "utf8"));

  it("is read from the links and the Markdown files it names", () => {
    expect(cited).toEqual(expect.arrayContaining(["CONTEXT.md", "docs/commands.md"]));
  });

  it.each(cited)("is tier 2: %s", (path) => {
    expect(riskTier([path]).tier).toBe(2);
  });
});
