import { Pressable, StyleSheet, Text, View } from "react-native";

import { openExternalUrl } from "./open-external-url";
import type { PublishedFigures } from "../../view-models/library";
import { colors, fonts, spacing } from "../../theme/tokens";

/** Where a player changes what their own profile publishes. */
export const STEAM_PRIVACY_URL = "https://steamcommunity.com/my/edit/settings";

type Props = {
  readonly published: PublishedFigures;
};

/**
 * Why an order is missing from the chips above, and why a row's hours read
 * zero.
 *
 * Steam governs playtime's visibility on its own, so a public profile can
 * publish every unlock and withhold every hour (CONTEXT.md, Playtime). Where it
 * does, the orders over that figure are not offered at all — every key would be
 * equal and the sort would hand back Steam's own arbitrary order under a chip
 * that looks selected. Controls that vanish need a reason given, or the screen
 * simply looks different on one profile than another for no stated cause.
 *
 * The two figures are named separately because they do not fall together: a
 * library can publish its hours and not its dates, and naming the playtime
 * there would be untrue.
 *
 * The line offers and does not instruct. This app shows any public profile and
 * has no authentication, so whoever is reading may not own what they are
 * looking at — "make your playtime public" would be addressed to someone with
 * no way to do it. It says what is missing, and where to change it if the
 * profile happens to be theirs.
 */
export function WithheldFiguresNote({ published }: Props) {
  const figure = published.playtime
    ? published.lastPlayed
      ? null
      : "when this profile last played"
    : "this profile's playtime";

  if (figure === null) {
    return null;
  }

  return (
    <View style={styles.note}>
      <Text style={styles.title}>{`Steam does not publish ${figure}`}</Text>
      <Pressable
        accessibilityRole="link"
        // The link is never withdrawn — not on a platform that opens it
        // differently, and not because an attempt failed. It is the way out for
        // whoever can take it, nothing better can be offered in its place, and
        // the note standing with what is missing is the part that matters.
        // `openExternalUrl` resolves either way, so a failure changes nothing
        // here and the link stays pressable.
        onPress={() => void openExternalUrl(STEAM_PRIVACY_URL)}
      >
        <Text style={styles.link}>if it is yours, open Steam's privacy settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    gap: 4,
    paddingHorizontal: spacing.xl,
    paddingBottom: 14,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
  },
  link: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textFaint,
    textDecorationLine: "underline",
  },
});
