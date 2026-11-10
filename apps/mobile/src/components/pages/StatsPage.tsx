import type { GameDto } from "@steam/contracts";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApiClient } from "../../api-client/use-api-client";
import { useLibraryLoad } from "../../api-client/use-library-load";
import { useLibraryTallies } from "../../api-client/use-library-tallies";
import { useLocale } from "../../settings/locale-store";
import { useChosenSteamId } from "../../settings/steam-id-store";
import { colors, spacing } from "../../theme/tokens";
import { messageFor } from "../../view-models/api-errors";
import { inPageOrder } from "../../view-models/stats-card-scroll";
import type { CountedUnlocks } from "../../view-models/unlock-days";
import { useStatsScroll } from "../../view-models/use-stats-scroll";
import { useUnlockWeek } from "../../view-models/use-unlock-week";
import { useYearsAndCumulative } from "../../view-models/use-years-and-cumulative";
import { BackButton } from "../atoms/BackButton";
import { StatsChips } from "../molecules/StatsChips";
import { ErrorState } from "../organisms/ErrorState";
import { UnlockWeekCard } from "../organisms/UnlockWeekCard";
import { YearsCumulativeCard } from "../organisms/YearsCumulativeCard";
import { StatsTemplate } from "../templates/StatsTemplate";

/** One array for every render with no library yet: the tallies are loaded off this identity. */
const NO_GAMES: readonly GameDto[] = [];

type Props = {
  readonly onBack: () => void;
  readonly onChangeProfile: () => void;
  /** The day "this year" is about. Left out, the day the page opened on; a story names one. */
  readonly today?: Date;
};

/**
 * The stats page: loads what the library loads, from the same cache, and
 * draws the cards from it (ADR-0022, ADR-0025). Knows nothing of the router.
 */
export function StatsPage({ onBack, onChangeProfile, today: givenToday }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const insets = useSafeAreaInsets();
  const steamId = useChosenSteamId();
  const apiClient = useApiClient();
  const library = useLibraryLoad(steamId, apiClient);
  const [today] = useState(() => givenToday ?? new Date());

  const games = library.status === "ready" ? library.games : NO_GAMES;
  const { tallies, counted, loaded } = useLibraryTallies(steamId, apiClient, games);
  const view = useMemo<CountedUnlocks>(() => ({ games, tallies }), [games, tallies]);
  const years = useYearsAndCumulative(view, counted, today);
  const week = useUnlockWeek(view, counted, locale);

  // Each card keeps its chip whatever it shows, empty or still counting: the
  // row never changes shape while the library is counted.
  const cards = inPageOrder([
    {
      key: "years",
      label: t("stats.chips.years"),
      node: <YearsCumulativeCard years={years} loaded={loaded} />,
    },
    {
      key: "week",
      label: t("stats.chips.week"),
      node: <UnlockWeekCard week={week} loaded={loaded} />,
    },
  ] as const);
  const scroll = useStatsScroll(cards.map((card) => card.key));

  if (library.status === "loading") {
    return (
      <View style={styles.centred}>
        <BackButton onPress={onBack} top={insets.top + spacing.sm} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (library.status === "error") {
    return (
      <ErrorState
        message={messageFor(library.error, t)}
        onRetry={library.retry}
        onChangeProfile={onChangeProfile}
      />
    );
  }

  return (
    <StatsTemplate
      title={t("stats.title")}
      onBack={onBack}
      chips={<StatsChips cards={cards} active={scroll.active} onSelect={scroll.goTo} />}
      cards={cards}
      scroll={scroll.binding}
    />
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
});
