/** PROTOTYPE — throwaway. Floating variant switcher, never shipped. */
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  readonly variants: readonly string[];
  readonly current: string;
  readonly name: string;
};

export function PrototypeSwitcher({ variants, current, name }: Props) {
  const index = Math.max(0, variants.indexOf(current));
  const go = (step: number) => {
    const next = variants[(index + step + variants.length) % variants.length];
    router.setParams({ variant: next });
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.pill}>
        <Pressable onPress={() => go(-1)} style={styles.arrow} accessibilityLabel="Previous variant">
          <Text style={styles.arrowLabel}>←</Text>
        </Pressable>
        <Text style={styles.label} numberOfLines={1}>{`${current} — ${name}`}</Text>
        <Pressable onPress={() => go(1)} style={styles.arrow} accessibilityLabel="Next variant">
          <Text style={styles.arrowLabel}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 14, alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f5f9",
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 5,
    maxWidth: "92%",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  arrow: { paddingHorizontal: 10, paddingVertical: 2 },
  arrowLabel: { color: "#0b0f14", fontFamily: fonts.sansSemiBold, fontSize: 15 },
  label: { color: "#0b0f14", fontFamily: fonts.sansMedium, fontSize: 11, flexShrink: 1 },
  measure: { color: colors.accent },
});
