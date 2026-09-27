import { describe, expect, it } from "vitest";

import { storyGaps } from "./missing-stories";

describe("storyGaps", () => {
  it("keeps quiet when every component has its stories", () => {
    const files = ["organisms/Card.tsx", "organisms/Card.stories.tsx", "organisms/Card.test.tsx"];

    expect(storyGaps(files, [])).toEqual({ unstoried: [], staleExceptions: [] });
  });

  it("names a component that has no stories", () => {
    const files = ["atoms/Chip.tsx", "atoms/Chip.test.tsx"];

    expect(storyGaps(files, []).unstoried).toEqual(["atoms/Chip.tsx"]);
  });

  /** Only a component is owed a gallery: helpers beside it are plain `.ts`. */
  it("leaves alone what is not a component", () => {
    const files = ["molecules/open-external-url.ts", "molecules/achievement-row-geometry.ts"];

    expect(storyGaps(files, []).unstoried).toEqual([]);
  });

  it("forgives a component on the exception list", () => {
    const files = ["atoms/Chip.tsx"];

    expect(storyGaps(files, ["atoms/Chip.tsx"])).toEqual({ unstoried: [], staleExceptions: [] });
  });

  /**
   * The list only ever empties. An entry that forgives nothing — the component
   * has its stories now, or is gone — would otherwise forgive whatever is
   * written there next, so it has to be struck the day it stops applying.
   */
  it("names an exception that no longer forgives anything", () => {
    const files = ["atoms/Chip.tsx", "atoms/Chip.stories.tsx"];

    expect(storyGaps(files, ["atoms/Chip.tsx", "atoms/Gone.tsx"]).staleExceptions).toEqual([
      "atoms/Chip.tsx",
      "atoms/Gone.tsx",
    ]);
  });
});
