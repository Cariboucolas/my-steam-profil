import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { RecordFigure } from "./RecordFigure";

const meta = {
  title: "Molecules/RecordFigure",
  component: RecordFigure,
  args: { record: { value: "312", label: "best month", when: "Jun 2025" } },
} satisfies Meta<typeof RecordFigure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Known: Story = {};
export const StillCounting: Story = { args: { record: null } };
