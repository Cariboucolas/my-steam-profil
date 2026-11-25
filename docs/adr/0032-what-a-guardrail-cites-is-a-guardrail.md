# What a guardrail cites is a guardrail

> Amends [ADR-0030](0030-tier-0-merges-itself-once-verify-passes.md).

Every file `AGENTS.md` cites was made tier 2 by ADR-0030, and a test read the citations from
`AGENTS.md` alone. That test now reads further: from `AGENTS.md`, it follows the citations of
every tier 2 Markdown document it reaches, to a fixed point, and every document reached must be
tier 2. `tools/repo-checks/src/cited-documents.ts` does the walk; `risk-tiers.test.ts` runs it on
the repository.

## Why

An agent sent to `docs/commands.md` reads what that page sends it to. A tier 0 page cited by a
tier 2 one would merge unread and change what agents do, as a cited page did before ADR-0030.
On `main` on 2026-11-17 the walk reached two such documents:

- `docs/images/README.md`, linked from `docs/commands.md`, was tier 0;
- `tools/steam-spike/FINDINGS.md`, named by ADR-0008, was tier 1.

Both become tier 2, in the table of `AGENTS.md` and in `risk-tiers.ts`.

## What the walk reads

- Relative Markdown links, resolved from the file that holds them; an anchor is ignored, a link
  with a scheme (`https:`, `mailto:`) or from the root is left out. A link to a path that does not
  exist fails the test: a broken citation is not one fewer to check.
- Markdown files named in backquotes, resolved from the file, then from the root, and followed
  only where they exist: an ADR may name an example path, as ADR-0030 names `docs/ADR/x.md`.
- Not the risk tiers section of `AGENTS.md`, whose backquotes are globs.
- A directory is checked but not read; a document that is not tier 2 is checked but not read
  further, since its citations are the owner's to read only once it becomes a guardrail.

## What it costs

A new link from a tier 2 document to a tier 0 or tier 1 one fails CI until that document gets a
rule. The ADRs cite widely, so a citation added to an ADR can move a document to tier 2: that is
the intent, and the failing test names the document and who cites it.

## What remains open

- Only Markdown is read. A workflow or a script that points an agent to a document is not.
- `apps/mobile/AGENTS.md` is reached and read like any tier 2 document; another `AGENTS.md` that
  nothing cites is tier 2 by its own rule, but its citations are not walked.
