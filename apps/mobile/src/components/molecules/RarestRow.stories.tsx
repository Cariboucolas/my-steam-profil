import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { namedRarest, rarestAwaitingItsName, rarestKnownByItsKey } from "../../fixtures/rarest";
import { RarestRow } from "./RarestRow";

const meta = {
  title: "Molecules/RarestRow",
  component: RarestRow,
  args: { onPress: fn() },
} satisfies Meta<typeof RarestRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Named: Story = { args: { row: namedRarest } };

/** Its game has not said what it calls it yet: the name pulses in the space it will fill. */
export const AwaitingItsName: Story = { args: { row: rarestAwaitingItsName } };

/** Its game answered and named nothing for it, so the row settles for the key it was ranked under. */
export const KnownByItsKey: Story = { args: { row: rarestKnownByItsKey } };
