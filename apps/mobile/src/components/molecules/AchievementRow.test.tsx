import { render } from "@testing-library/react-native";

import type { AchievementRow as Row } from "../../view-models/game-progress";
import { colors } from "../../theme/tokens";
import { AchievementRow, ACHIEVEMENT_TILE_TEST_ID } from "./AchievementRow";

const row = (over: Partial<Row> = {}): Row => ({
  apiName: "SLAY_THE_WARDEN",
  name: "Slay the Warden",
  description: "Defeat the Warden on any difficulty",
  iconUrl: "https://example.invalid/warden.jpg",
  unlocked: true,
  dateLabel: "25 Jun 2026",
  ...over,
});

describe("AchievementRow", () => {
  it("shows the achievement and when it was earned", () => {
    const { getByText } = render(<AchievementRow row={row()} />);

    expect(getByText("Slay the Warden")).toBeTruthy();
    expect(getByText("Defeat the Warden on any difficulty")).toBeTruthy();
    expect(getByText("25 Jun 2026")).toBeTruthy();
  });

  it("lights up one the player has earned", () => {
    const { getByText, getByTestId } = render(<AchievementRow row={row()} />);

    expect(getByTestId(ACHIEVEMENT_TILE_TEST_ID)).toHaveStyle({
      backgroundColor: colors.accentSoft,
      borderColor: colors.accentBorder,
      opacity: 1,
    });
    expect(getByText("Slay the Warden").props.style.color).toBe(colors.text);
    expect(getByText("25 Jun 2026").props.style.color).toBe(colors.textMuted);
  });

  /**
   * A locked icon is already grey coming from Steam, so the row dims the whole
   * tile on top of that rather than relying on the artwork to look locked.
   */
  it("dims one the player has not", () => {
    const { getByText, getByTestId } = render(
      <AchievementRow row={row({ unlocked: false, dateLabel: "Locked" })} />,
    );

    expect(getByTestId(ACHIEVEMENT_TILE_TEST_ID)).toHaveStyle({
      backgroundColor: colors.tileEmpty,
      borderColor: colors.hairline,
      opacity: 0.75,
    });
    expect(getByText("Slay the Warden").props.style.color).toBe(colors.textMuted);
    expect(getByText("Locked").props.style.color).toBe(colors.textFaint);
  });
});
