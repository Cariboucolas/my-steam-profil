/**
 * PROTOTYPE — throwaway route, branch `prototype/activity-grid-width`.
 *
 * Three variants of the Activity card on one route, switchable with
 * `?variant=A|B|C`, the floating bar, or ← / →.
 *
 * The real ProfileHeader and LibraryStatsCard sit above it on stub props, so
 * the grid is judged against the density it will actually live in rather than
 * in a vacuum — but nothing here calls the API, so it runs with `pnpm start`
 * and no backend and no Steam id.
 *
 * Resize the browser to change the phone width: the root layout caps the
 * column at 402px, so a narrower window is a narrower phone. Test 402 (the
 * width the design was drawn at) and 375 (iPhone mini / SE).
 */
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LibraryStatsCard } from "../../src/components/organisms/LibraryStatsCard";
import { ProfileHeader } from "../../src/components/organisms/ProfileHeader";
import { PrototypeSwitcher } from "../../src/components/prototype/PrototypeSwitcher";
import {
  buildYear,
  VariantA,
  VariantB,
  VariantC,
} from "../../src/components/prototype/activity-variants";
import { colors, fonts, spacing } from "../../src/theme/tokens";

const VARIANTS = ["A", "B", "C"] as const;

const PROFILE = {
  steamId: "76561197960287930",
  personaName: "Prototype",
  avatarUrl: "",
  profileUrl: "",
};

const SUMMARY = {
  unlocked: 4127,
  total: 9880,
  rateLabel: "42%",
  fraction: "4 127 / 9 880",
  perfectGames: 11,
  playtimeLabel: "1 204 h",
};

export default function ActivityPrototype() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const key = VARIANTS.includes(params.variant as never) ? (params.variant as string) : "A";
  const year = useMemo(() => buildYear(20260904), []);

  const Variant = key === "B" ? VariantB : key === "C" ? VariantC : VariantA;
  const note = `variant ${key} · synthetic year · resize the window to change phone width`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader profile={PROFILE} gameCount={267} onChangeProfile={() => {}} />
        <LibraryStatsCard summary={SUMMARY} gameCount={267} loaded={null} />
        <Variant year={year} note={note} />
        <Text style={styles.footer}>
          {"Everything below the card is what the real screen puts there.\nThe grid must fit with no horizontal scroll."}
        </Text>
      </ScrollView>
      <PrototypeSwitcher variants={VARIANTS} current={key} name={Variant.variantName} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: spacing.xxl, paddingBottom: 90 },
  footer: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 9,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
