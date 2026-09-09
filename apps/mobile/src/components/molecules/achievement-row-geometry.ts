import { StyleSheet } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";

/**
 * The shape both achievement rows are drawn on.
 *
 * #31 asked for the rarest-unlocks ranking to read as the same kind of list as
 * a game's own achievements: a square icon tile, a name, one line under it. The
 * two lists are never on screen together, so a drift between them would go
 * unseen — the geometry lives here once and both molecules read it.
 *
 * State stays with the caller. An AchievementRow's tile is coloured and dimmed
 * by whether the player has earned it, a RarestRow's tile has the one look, and
 * their right-hand ends — a date, a StatBlock — have nothing in common. Nothing
 * here takes a flag to tell its two callers apart; a piece that would need one
 * belongs in the row that needs it.
 */

/** The icon tile's side, which is what sets the row's height. */
const TILE = 44;

export const achievementRowGeometry = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
  },
  /**
   * Colours left out: an AchievementRow's tile is coloured by whether the
   * player has earned the row, and that state stays with it.
   */
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  /** Colour left out: an AchievementRow greys the name of a locked row. */
  name: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
  },
  /** The line under the name: a description on one row, a game on the other. */
  subLine: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.textDim,
  },
});
