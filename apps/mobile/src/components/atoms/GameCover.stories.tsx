import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { PLAYED_GAME } from "../../fixtures/library";
import { GameCover } from "./GameCover";

const meta = {
  title: "Atoms/GameCover",
  component: GameCover,
} satisfies Meta<typeof GameCover>;

export default meta;

type Story = StoryObj<typeof meta>;

/** At the size a library row draws it. */
export const InALibraryRow: Story = {
  args: { appId: PLAYED_GAME.appId, width: 76, height: 36 },
};
