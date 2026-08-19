import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { ProfileDto } from "@steam/contracts";
import { colors, fonts, spacing } from "../../theme/tokens";

const AVATAR = 44;

type Props = {
  readonly profile: ProfileDto;
  readonly gameCount: number;
};

export function ProfileHeader({ profile, gameCount }: Props) {
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
        <Text style={styles.meta}>{`${gameCount} games`}</Text>
      </View>
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
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textDim,
  },
});
