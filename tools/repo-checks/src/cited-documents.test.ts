import { describe, expect, it } from "vitest";

import { citedDocuments, type Documents } from "./cited-documents.ts";

/** A repository held in memory: a path with text is a file, a path with null a directory. */
const repository = (entries: Record<string, string | null>): Documents => ({
  read: (path) => entries[path] ?? undefined,
  exists: (path) => path in entries,
});

/** Every Markdown file is followed, as if every one were tier 2. */
const everyMarkdown = (path: string) => path.endsWith(".md");

const paths = (found: readonly { readonly path: string }[]) => found.map((one) => one.path);

describe("citedDocuments", () => {
  it("follows links, resolved from the file that holds them, to a fixed point", () => {
    const documents = repository({
      "AGENTS.md": "[commands](docs/commands.md)",
      "docs/commands.md": "[images](images/README.md#build) and [back](../AGENTS.md)",
      "docs/images/README.md": "no link",
    });

    expect(paths(citedDocuments("AGENTS.md", documents, everyMarkdown).cited)).toEqual([
      "docs/commands.md",
      "docs/images/README.md",
    ]);
  });

  it("says which document cites each one", () => {
    const documents = repository({ "AGENTS.md": "[a](a.md)", "a.md": "" });

    expect(citedDocuments("AGENTS.md", documents, everyMarkdown).cited).toEqual([
      { path: "a.md", from: "AGENTS.md" },
    ]);
  });

  it("reads no further than a document it is not told to follow", () => {
    const documents = repository({
      "AGENTS.md": "[a](a.md)",
      "a.md": "[b](b.md)",
      "b.md": "",
    });

    expect(paths(citedDocuments("AGENTS.md", documents, (path) => path !== "a.md").cited)).toEqual([
      "a.md",
    ]);
  });

  it("leaves out external links and keeps a directory without reading it", () => {
    const documents = repository({
      "AGENTS.md": "[web](https://example.com/x.md) [mail](mailto:a@b.c) [dir](docs/agents/)",
      "docs/agents/": null,
    });

    expect(paths(citedDocuments("AGENTS.md", documents, everyMarkdown).cited)).toEqual([
      "docs/agents/",
    ]);
  });

  /** A link that leads nowhere is a broken citation, not one fewer to check. */
  it("reports a link to a path that does not exist", () => {
    const documents = repository({ "AGENTS.md": "[gone](docs/gone.md)" });

    expect(citedDocuments("AGENTS.md", documents, everyMarkdown)).toEqual({
      cited: [],
      missing: [{ path: "docs/gone.md", from: "AGENTS.md" }],
    });
    expect(
      citedDocuments("AGENTS.md", repository({ "AGENTS.md": "[out](../x.md)" }), everyMarkdown)
        .missing,
    ).toEqual([{ path: "../x.md", from: "AGENTS.md" }]);
  });

  /**
   * A Markdown file named in backquotes is cited when it exists, from the file
   * or from the root; one that does not is an example, as `docs/ADR/x.md` is.
   */
  it("follows a Markdown file named in backquotes only where it exists", () => {
    const documents = repository({
      "docs/adr/0001.md": "`CONTEXT.md`, `README.md` here, `docs/ADR/x.md`, `**/AGENTS.md`",
      "CONTEXT.md": "",
      "docs/adr/README.md": "",
    });

    expect(citedDocuments("docs/adr/0001.md", documents, everyMarkdown)).toEqual({
      cited: [
        { path: "CONTEXT.md", from: "docs/adr/0001.md" },
        { path: "docs/adr/README.md", from: "docs/adr/0001.md" },
      ],
      missing: [],
    });
  });

  /** In AGENTS.md the backquotes of the risk tiers are globs, not citations. */
  it("skips a risk tiers section", () => {
    const documents = repository({
      "AGENTS.md": "## Risk tiers\n- `README.md`, [x](x.md)\n## Invariants\n[y](y.md)",
      "README.md": "",
      "x.md": "",
      "y.md": "",
    });

    expect(paths(citedDocuments("AGENTS.md", documents, everyMarkdown).cited)).toEqual(["y.md"]);
  });
});
