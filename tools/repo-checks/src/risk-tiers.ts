/**
 * The risk tier of a change, computed from the paths it touches rather than
 * declared by its author (ADR-0028). The globs below are the table in
 * AGENTS.md: `risk-tiers.test.ts` fails when the two disagree, either way.
 * Only paths are read, never content: where AGENTS.md once let content lower a
 * tier, the path keeps the higher one.
 */
export type Tier = 0 | 1 | 2;

/** The rule named for a path that no tier lists, which AGENTS.md makes tier 2. */
export const LISTED_NOWHERE = "listed by no tier";

const UNLISTED_TIER: Tier = 2;

/** Highest tier first: a path takes the first tier with a glob that matches it. */
export const TIERS: readonly { readonly tier: Tier; readonly globs: readonly string[] }[] = [
  {
    tier: 2,
    globs: [
      // Guardrails
      "AGENTS.md",
      "**/AGENTS.md",
      "**/CLAUDE.md",
      "**/.claude/**",
      "docs/agents/**",
      "docs/adr/**",
      "tools/repo-checks/**",
      // CI and the gate
      ".github/**",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      ".nvmrc",
      "biome.jsonc",
      "tsconfig.base.json",
      "**/vitest.config.ts",
      "apps/mobile/package.json",
      // Infrastructure and deployment
      "apps/*/wrangler.jsonc",
      "apps/*/src/worker.ts",
      "apps/mobile/app.json",
      "apps/mobile/eas.json",
      "apps/mobile/metro.config.js",
      "tools/health-probe/**",
      "tools/native-build/**",
      // Secrets
      "**/.env.example",
      "apps/api/src/http/config.ts",
      "apps/api/src/http/failure-log.ts",
      // Authentication
      "apps/alerts/src/signature.ts",
      // Data deletion
      "apps/mobile/src/settings/**",
    ],
  },
  { tier: 1, globs: ["apps/**", "packages/**", "tools/**"] },
  { tier: 0, globs: ["README.md", "CONTEXT.md", "docs/**"] },
];

export type ClassifiedPath = { readonly path: string; readonly tier: Tier; readonly rule: string };
export type RiskTier = { readonly tier: Tier; readonly paths: readonly ClassifiedPath[] };

/** `**` crosses directories, `*` stays inside one; a leading dot is an ordinary character. */
const toRegExp = (glob: string): RegExp =>
  new RegExp(
    `^${glob
      .split(/(\*\*\/|\/\*\*$|\*)/)
      .map((part) => {
        if (part === "**/") return "(?:.*/)?";
        if (part === "/**") return "/.*";
        if (part === "*") return "[^/]*";
        return part.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("")}$`,
  );

const RULES = TIERS.flatMap(({ tier, globs }) =>
  globs.map((glob) => ({ tier, glob, pattern: toRegExp(glob) })),
);

const classify = (path: string): ClassifiedPath => {
  const rule = RULES.find((one) => one.pattern.test(path));
  return rule
    ? { path, tier: rule.tier, rule: rule.glob }
    : { path, tier: UNLISTED_TIER, rule: LISTED_NOWHERE };
};

/** A change takes the highest tier of any path it touches; touching nothing is tier 0. */
export const riskTier = (paths: readonly string[]): RiskTier => {
  const classified = paths.map(classify);
  const tier = classified.reduce<Tier>(
    (highest, one) => (one.tier > highest ? one.tier : highest),
    0,
  );
  return { tier, paths: classified };
};
