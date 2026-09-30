import { composeStories, setProjectAnnotations } from "@storybook/react";
import { render } from "@testing-library/react-native";
import type { ComponentType } from "react";

import { letTheDeviceAnswer } from "../accessibility/reduce-motion.test-support";
import preview from "../../.storybook/preview";
import * as libraryStatsCard from "./organisms/LibraryStatsCard.stories";
import * as localeToggle from "./atoms/LocaleToggle.stories";

type StoryFile = Parameters<typeof composeStories>[0];

/** The gallery as the toolbar leaves it: `locale` is a global, `en` unless someone picks. */
const galleryIn = (file: object, locale?: string): Record<string, ComponentType> => {
  setProjectAnnotations(
    locale === undefined
      ? preview
      : [preview, { initialGlobals: { ...preview.initialGlobals, locale } }],
  );
  return composeStories(file as StoryFile);
};

describe("the gallery's language switch", () => {
  afterAll(() => setProjectAnnotations(preview));

  it("is English by default", async () => {
    const Counted = galleryIn(libraryStatsCard)["Counted"]!;
    const { getByText, queryByText } = render(<Counted />);
    await letTheDeviceAnswer();

    expect(getByText("perfect games")).toBeTruthy();
    expect(getByText("COMPLETED")).toBeTruthy();
    expect(queryByText("jeux à 100 %")).toBeNull();
  });

  it("changes the language of a component and of the sentences a view-model wrote for it", async () => {
    const Counted = galleryIn(libraryStatsCard, "fr")["Counted"]!;
    const { getByText, queryByText } = render(<Counted />);
    await letTheDeviceAnswer();

    expect(getByText("jeux à 100 %")).toBeTruthy();
    expect(getByText(/ sur \d+ jeux comptabilisés$/)).toBeTruthy();
    expect(queryByText("perfect games")).toBeNull();
  });

  it("changes the language of a story with no view-model in it", async () => {
    const English = galleryIn(localeToggle, "fr")["English"]!;
    const { getByLabelText } = render(<English />);
    await letTheDeviceAnswer();

    expect(getByLabelText("Langue")).toBeTruthy();
  });
});
