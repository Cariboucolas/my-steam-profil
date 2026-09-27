import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import { Skeleton } from "../atoms/Skeleton";
import { SetupTemplate } from "./SetupTemplate";

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingHorizontal: spacing.xl },
});

const meta = {
  title: "Templates/SetupTemplate",
  component: SetupTemplate,
} satisfies Meta<typeof SetupTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Stands in for the form: a title, a hint, a field and its button. */
export const WithForm: Story = {
  args: {
    form: (
      <View style={styles.form}>
        <Skeleton width={220} height={22} />
        <Skeleton width={180} height={11} />
        <Skeleton width={350} height={44} />
        <Skeleton width={350} height={44} />
      </View>
    ),
  },
};
