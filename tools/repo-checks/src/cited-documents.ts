/**
 * What an agent reads, starting from AGENTS.md: the documents it cites, the
 * documents those cite, and so on to a fixed point (ADR-0032). The caller
 * says which documents to read further; a link that leads nowhere is reported,
 * never dropped.
 */
import { posix } from "node:path";

/** The repository as this reads it: paths are relative to its root. */
export type Documents = {
  /** The text of a file, or undefined for a directory or nothing. */
  readonly read: (path: string) => string | undefined;
  readonly exists: (path: string) => boolean;
};

export type Citation = { readonly path: string; readonly from: string };
export type CitedDocuments = {
  readonly cited: readonly Citation[];
  readonly missing: readonly Citation[];
};

/** In AGENTS.md, the risk tiers' backquotes are globs, not documents. */
const RISK_TIERS = /^## Risk tiers$[\s\S]*?(?=^## |(?![\s\S]))/m;
const LINK = /\]\(([^)#\s]+)(?:#[^)]*)?\)/g;
const NAMED = /`([^`\s*]+\.md)`/g;
/** A scheme, as in `https:` or `mailto:`, leads out of the repository. */
const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

const resolve = (from: string, target: string): string =>
  posix.normalize(posix.join(posix.dirname(from), target));

const insideRoot = (path: string): boolean => path !== ".." && !path.startsWith("../");

type Found = { readonly path: string; readonly checked: boolean };

/** A link must lead somewhere; a name in backquotes may be an example. */
const citationsIn = (from: string, text: string, documents: Documents): readonly Found[] => {
  const prose = text.replace(RISK_TIERS, "");
  const links = [...prose.matchAll(LINK)]
    .map((match) => match[1] ?? "")
    .filter((target) => !EXTERNAL.test(target) && !target.startsWith("/"))
    .map((target) => ({ path: resolve(from, target), checked: true }));
  const named = [...prose.matchAll(NAMED)].flatMap((match) => {
    const name = match[1] ?? "";
    const found = [resolve(from, name), posix.normalize(name)].find(
      (path) => insideRoot(path) && documents.exists(path),
    );
    return found ? [{ path: found, checked: false }] : [];
  });
  return [...links, ...named];
};

export const citedDocuments = (
  start: string,
  documents: Documents,
  follows: (path: string) => boolean,
): CitedDocuments => {
  const seen = new Set([start]);
  const cited: Citation[] = [];
  const missing: Citation[] = [];
  const queue = [start];

  for (let from = queue.shift(); from !== undefined; from = queue.shift()) {
    const text = documents.read(from);
    if (text === undefined) continue;
    for (const { path, checked } of citationsIn(from, text, documents)) {
      if (seen.has(path)) continue;
      seen.add(path);
      if (checked && !(insideRoot(path) && documents.exists(path))) {
        missing.push({ path, from });
        continue;
      }
      cited.push({ path, from });
      if (follows(path)) queue.push(path);
    }
  }

  return { cited, missing };
};
