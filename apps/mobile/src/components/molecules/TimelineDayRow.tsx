import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { TimelineDay } from "../../view-models/game-progress";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

const DOT = 7;
const RAIL = 11;

type Props = { readonly day: TimelineDay };

export function TimelineDayRow({ day }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.dateColumn}>
        <Text style={styles.day}>{day.day}</Text>
        <Text style={styles.year}>{day.year}</Text>
      </View>

      {/* The mock's vertical rule, with a dot marking the day. */}
      <View style={styles.rail}>
        <View style={styles.line} />
        <View style={styles.dot} />
      </View>

      <View style={styles.items}>
        <Text style={styles.count}>{day.countLabel}</Text>
        {day.items.map((item) => (
          <View key={item.apiName} style={styles.item}>
            <Image
              source={{ uri: item.iconUrl }}
              style={styles.icon}
              contentFit="cover"
              cachePolicy="disk"
            />
            <View style={styles.itemText}>
              <Text numberOfLines={1} style={styles.itemName}>
                {item.name}
              </Text>
              <Text style={styles.time}>{item.timeLabel}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  dateColumn: {
    width: 52,
    alignItems: "flex-end",
    paddingTop: 2,
  },
  day: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.text,
  },
  year: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textDim,
    marginTop: 2,
  },
  rail: {
    width: RAIL,
    alignItems: "center",
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dot: {
    position: "absolute",
    top: 5,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.accent,
  },
  items: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 24,
    gap: spacing.sm,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textDim,
    marginBottom: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 10,
    paddingRight: spacing.md,
    borderRadius: radius.md + 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.accentSoft,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: colors.text,
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textDim,
  },
});
