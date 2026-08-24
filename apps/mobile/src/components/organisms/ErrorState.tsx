import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";

type Props = {
  readonly message: string;
  /** Runs the same request again — for a backend that was down and may be up. */
  readonly onRetry: () => void;
  /** Absent where changing the profile would not help, or is not reachable. */
  readonly onChangeProfile?: (() => void) | undefined;
};

/**
 * What a screen shows when it has nothing to show. Every message this renders
 * tells the reader to do something — try again, pick another profile — and
 * these controls are what makes that advice true. A screen in this state
 * renders no header, so without them there is no way out but killing the app.
 */
export function ErrorState({ message, onRetry, onChangeProfile }: Props) {
  return (
    <View style={styles.centred}>
      <Text style={styles.message}>{message}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={styles.retry}
      >
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>

      {onChangeProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile"
          onPress={onChangeProfile}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>Change profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  retry: {
    marginTop: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.accent,
  },
  secondary: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textDim,
  },
});
