import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { composeStories, setProjectAnnotations } from "@storybook/react";
import { act, render } from "@testing-library/react-native";
import type { ComponentType } from "react";
import preview from "../../.storybook/preview";
import { letTheDeviceAnswer } from "../accessibility/reduce-motion.test-support";

setProjectAnnotations(preview);

const STORY_FILE = /\.stories\.tsx$/;

type StoryFile = Parameters<typeof composeStories>[0];

const storyFilesUnder = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return storyFilesUnder(full);
    return STORY_FILE.test(entry.name) ? [full] : [];
  });

/**
 * Found on disk rather than listed, so a story file nobody registers here is
 * still rendered: the guarantee is that every story renders, not every story
 * someone remembered (ADR-0021).
 */
const stories = storyFilesUnder(__dirname).flatMap((file) => {
  const composed: Record<string, ComponentType> = composeStories(require(file) as StoryFile);
  return Object.entries(composed).map(
    ([name, Story]) => [`${relative(__dirname, file)} › ${name}`, Story] as const,
  );
});

/**
 * A story whose backend is unavailable asks once more (#162), one timer tick
 * after the first refusal. Left alone, that second answer reaches the page
 * after the test has stopped looking, or after it has been torn down.
 */
const letARetryLand = (): Promise<void> =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

it("finds the stories it is meant to render", () => {
  expect(stories.length).toBeGreaterThan(0);
});

describe.each(stories)("%s", (_, Story) => {
  it("renders", async () => {
    const { toJSON } = render(<Story />);
    await letTheDeviceAnswer();
    await letARetryLand();

    expect(toJSON()).not.toBeNull();
  });
});
