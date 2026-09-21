import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ProfileDto } from "@steam/contracts";
import { NOT_READ } from "../../accessibility/not-read";
import { colors, fonts, spacing } from "../../theme/tokens";

const AVATAR = 44;

export const PROFILE_REVISION_TEST_ID = "profile-revision";

type Props = {
  readonly profile: ProfileDto;
  readonly gameCount: number;
  /**
   * What the running JavaScript says it was built from: a short commit, or
   * `dev` (ADR-0016). Handed in rather than read here, so the header stays a
   * component that writes what it is given and the build-time value is
   * resolved once, where the screen is assembled.
   */
  readonly revision: string;
  /** Required: a screen with no way back to the setup form is a dead end. */
  readonly onChangeProfile: () => void;
};

export function ProfileHeader({ profile, gameCount, revision, onChangeProfile }: Props) {
  return (
    <View style={styles.row}>
      <Image
        source={{ uri: profile.avatarUrl }}
        style={styles.avatar}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {profile.personaName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{`${gameCount} games`}</Text>
          {/* Its own element rather than more of the line above, because what
              is written and what is read part company here: the revision is
              provenance for whoever is looking, and three more words between
              the count and the way out for whoever is listening. It is not
              dragged out with a selection either — a commit is read off the
              screen, and taking it any other way is deliberately unclaimed. */}
          <Text
            testID={PROFILE_REVISION_TEST_ID}
            style={styles.meta}
            selectable={false}
            {...NOT_READ}
          >
            {`· revision ${revision}`}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change profile"
        onPress={onChangeProfile}
        // The one accent of the design is spent on completion, not on this.
        style={styles.change}
      >
        <Text style={styles.changeLabel}>Change</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: spacing.xl,
    paddingBottom: 22,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 19,
    color: colors.text,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    // Wraps rather than clips: a revision cut short reads as a different
    // commit, where one on its own line is only a narrower screen.
    flexWrap: "wrap",
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textDim,
  },
  change: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textDim,
  },
});
