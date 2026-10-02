import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApiClient } from "../../api-client/use-api-client";
import { useGameLoad } from "../../api-client/use-game-load";
import { useLocale } from "../../settings/locale-store";
import { useChosenSteamId } from "../../settings/steam-id-store";
import { colors, fonts, spacing } from "../../theme/tokens";
import { messageFor } from "../../view-models/api-errors";
import {
  type AchievementFilter,
  buildAchievementRows,
  buildFilterCounts,
  buildGameSummary,
  buildTimelineDays,
  filterLabel,
} from "../../view-models/game-progress";
import { Chip } from "../atoms/Chip";
import { LocaleToggle } from "../atoms/LocaleToggle";
import { Tabs } from "../atoms/Tabs";
import { AchievementRow } from "../molecules/AchievementRow";
import { TimelineDayRow } from "../molecules/TimelineDayRow";
import { CompletionSummary } from "../organisms/CompletionSummary";
import { ErrorState } from "../organisms/ErrorState";
import { GameHero } from "../organisms/GameHero";
import { GameTemplate } from "../templates/GameTemplate";

/** Soulstone Survivors alone defines 483 achievements. */
const ACHIEVEMENTS_INITIAL_ROWS = 10;

type Props = {
  /** As the route read it: not a whole number when the address named no game. */
  readonly appId: number;
  readonly onBack: () => void;
  readonly onChangeProfile: () => void;
};

/**
 * One game: the one place its progress is loaded, and everything drawn from it
 * (ADR-0022). Knows nothing of the router — the way back and the way to
 * another profile are handed in.
 */
export function GamePage({ appId, onBack, onChangeProfile }: Props) {
  const { t } = useTranslation();
  const tabLabels = [t("game.tabs.achievements"), t("game.tabs.timeline")];
  const { locale, choose } = useLocale();
  const insets = useSafeAreaInsets();
  const apiClient = useApiClient();
  const load = useGameLoad(useChosenSteamId(), apiClient, appId);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState<AchievementFilter>("all");

  const game = load.status === "ready" ? load.game : null;
  const progress = load.status === "ready" ? load.progress : null;

  const summary = useMemo(
    () => (game ? buildGameSummary(game, progress, t) : null),
    [game, progress, t],
  );
  const counts = useMemo(() => (progress ? buildFilterCounts(progress) : null), [progress]);
  const rows = useMemo(
    () =>
      (progress ? buildAchievementRows(progress, filter, t) : []).map((row) => (
        <AchievementRow key={row.apiName} row={row} />
      )),
    [progress, filter, t],
  );
  const days = useMemo(
    () =>
      (progress ? buildTimelineDays(progress, t) : []).map((day) => (
        <TimelineDayRow key={day.key} day={day} />
      )),
    [progress, t],
  );

  if (load.status === "loading") {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (load.status === "error") {
    // A deep link straight to this screen can be the only history entry, so
    // there is no back path at all: both a retry and a way to another
    // profile have to be offered here, the same as the library screen.
    return (
      <ErrorState
        message={messageFor(load.error, t)}
        onRetry={load.retry}
        onChangeProfile={onChangeProfile}
      />
    );
  }

  const hasAchievements = progress !== null && progress.completion.total > 0;

  const header = (
    <>
      <GameHero
        appId={load.game.appId}
        name={load.game.name}
        meta={summary?.meta ?? ""}
        topInset={insets.top}
        onBack={onBack}
        languageSwitch={
          choose ? (
            <LocaleToggle active={locale} onSelect={(next) => void choose(next)} />
          ) : undefined
        }
      />
      {summary && <CompletionSummary summary={summary} />}
      <Tabs labels={tabLabels} activeIndex={tab} onSelect={setTab} />

      {hasAchievements && tab === 0 && counts && (
        <View style={styles.filters}>
          <Chip
            label={filterLabel("all", counts, t)}
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label={filterLabel("unlocked", counts, t)}
            active={filter === "unlocked"}
            onPress={() => setFilter("unlocked")}
          />
          <Chip
            label={filterLabel("locked", counts, t)}
            active={filter === "locked"}
            onPress={() => setFilter("locked")}
          />
        </View>
      )}

      {!hasAchievements && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {progress === null ? t("game.empty.notLoaded") : t("game.empty.noAchievements")}
          </Text>
          {progress === null && (
            <Text style={styles.emptyHint}>{t("game.empty.notLoadedHint")}</Text>
          )}
        </View>
      )}
    </>
  );

  if (tab === 1) {
    return (
      <GameTemplate
        header={header}
        rows={days}
        spaceAfterHeader
        empty={
          hasAchievements ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t("game.empty.nothingUnlocked")}</Text>
            </View>
          ) : null
        }
      />
    );
  }

  return <GameTemplate header={header} rows={rows} initialRows={ACHIEVEMENTS_INITIAL_ROWS} />;
}

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  filters: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 6,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyHint: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textFaint,
    textAlign: "center",
    maxWidth: 250,
  },
});
