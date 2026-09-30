import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { rarestRowsIn } from "../../fixtures/rarest";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { RarestRow } from "./RarestRow";

const meta = {
  title: "Molecules/RarestRow",
  component: RarestRow,
  args: { onPress: fn() },
} satisfies Meta<typeof RarestRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyOf = (which: keyof ReturnType<typeof rarestRowsIn>): Story => ({
  args: { row: rarestRowsIn(english)[which] },
  render: inTheToolbarsLanguage(RarestRow, (t) => ({ row: rarestRowsIn(t)[which] })),
});

export const Named: Story = storyOf("named");

/** Its game has not said what it calls it yet: the name pulses in the space it will fill. */
export const AwaitingItsName: Story = storyOf("awaitingItsName");

/** Its game answered and named nothing for it, so the row settles for the key it was ranked under. */
export const KnownByItsKey: Story = storyOf("knownByItsKey");
