/**
 * A story drifts from its component silently: nothing fails when a component
 * is added without one, and the gallery simply stops describing the library.
 * This is `check:tests`'s mirror for stories (#75): every component under the
 * atomic levels carries a `.stories.tsx` beside it, save those on a list that
 * only ever empties.
 */
const COMPONENT = /\.tsx$/;
const NOT_A_COMPONENT = /\.(test|stories)\.tsx$/;

export type StoryGaps = {
  /** Components with no stories file beside them, and no exception either. */
  readonly unstoried: readonly string[];
  /** Exceptions that forgive nothing any more and should be struck. */
  readonly staleExceptions: readonly string[];
};

/** Paths are relative to the components root, slash-separated. */
export const storyGaps = (
  files: readonly string[],
  exceptions: readonly string[],
): StoryGaps => {
  const present = new Set(files);
  const components = files.filter((one) => COMPONENT.test(one) && !NOT_A_COMPONENT.test(one));
  const withoutStories = components.filter(
    (one) => !present.has(one.replace(COMPONENT, ".stories.tsx")),
  );
  const forgiven = new Set(exceptions);

  return {
    unstoried: withoutStories.filter((one) => !forgiven.has(one)),
    staleExceptions: exceptions.filter((one) => !withoutStories.includes(one)),
  };
};
