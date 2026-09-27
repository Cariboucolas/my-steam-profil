import type { GameDto, GameProgressDto } from "@steam/contracts";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApiClient } from "../../api-client/use-api-client";
import { colors, fonts, spacing } from "../../theme/tokens";
import { messageFor } from "../../view-models/api-errors";
import {
  buildAchievementRows,
  buildFilterCounts,
  buildGameSummary,
  buildTimelineDays,
  gameInLibrary,
  type AchievementFilter,
} from "../../view-models/game-progress";
import { Chip } from "../atoms/Chip";
import { Tabs } from "../atoms/Tabs";
import { AchievementRow } from "../molecules/AchievementRow";
import { TimelineDayRow } from "../molecules/TimelineDayRow";
import { CompletionSummary } from "../organisms/CompletionSummary";
import { ErrorState } from "../organisms/ErrorState";
import { GameHero } from "../organisms/GameHero";
import { GameTemplate } from "../templates/GameTemplate";

type Loaded = { readonly game: GameDto; readonly progress: GameProgressDto | null };
type State =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: Loaded };

const TABS = ["Achievements", "Timeline"] as const;

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
  const insets = useSafeAreaInsets();
  const apiClient = useApiClient();
  const [state, setState] = useState<State>({ status: "loading" });
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState<AchievementFilter>("all");
  // Bumped to re-run the load when nothing else about the request changed —
  // a backend that was down and may now be up.
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (apiClient === undefined) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      if (!Number.isInteger(appId)) {
        setState({ status: "error", message: "That is not a game id." });
        return;
      }

      const games = await apiClient.getGames();
      if (cancelled) return;
      if (!games.ok) {
        setState({ status: "error", message: messageFor(games.error) });
        return;
      }

      // ADR-0004: the backend answers for any appId, so a game outside the
      // library is refused here or nowhere.
      const game = gameInLibrary(games.value, appId);
      if (!game) {
        setState({ status: "error", message: "This game is not in the library." });
        return;
      }

      const progress = await apiClient.getGameProgress(appId);
      if (cancelled) return;

      if (progress.ok) {
        setState({ status: "ready", data: { game, progress: progress.value } });
        return;
      }
      if (progress.error === "NOT_LOADED") {
        // Not a failure: the achievements were simply never fetched for it.
        setState({ status: "ready", data: { game, progress: null } });
        return;
      }
      setState({ status: "error", message: messageFor(progress.error) });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [appId, apiClient, reloadNonce]);

  const progress = state.status === "ready" ? state.data.progress : null;

  const summary = useMemo(
    () =>
      state.status === "ready"
        ? buildGameSummary(state.data.game, progress)
        : null,
    [state, progress],
  );
  const counts = useMemo(() => (progress ? buildFilterCounts(progress) : null), [progress]);
  const rows = useMemo(
    () =>
      (progress ? buildAchievementRows(progress, filter) : []).map((row) => (
        <AchievementRow key={row.apiName} row={row} />
      )),
    [progress, filter],
  );
  const days = useMemo(
    () =>
      (progress ? buildTimelineDays(progress) : []).map((day) => (
        <TimelineDayRow key={day.key} day={day} />
      )),
    [progress],
  );

  if (state.status === "loading") {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (state.status === "error") {
    // A deep link straight to this screen can be the only history entry, so
    // there is no back path at all: both a retry and a way to another
    // profile have to be offered here, the same as the library screen.
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadNonce((previous) => previous + 1)}
        onChangeProfile={onChangeProfile}
      />
    );
  }

  const { game } = state.data;
  const hasAchievements = progress !== null && progress.completion.total > 0;

  const header = (
    <>
      <GameHero
        appId={game.appId}
        name={game.name}
        meta={summary?.meta ?? ""}
        topInset={insets.top}
        onBack={onBack}
      />
      {summary && <CompletionSummary summary={summary} />}
      <Tabs labels={TABS} activeIndex={tab} onSelect={setTab} />

      {hasAchievements && tab === 0 && counts && (
        <View style={styles.filters}>
          <Chip label={`All ${counts.all}`} active={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label={`Unlocked ${counts.unlocked}`} active={filter === "unlocked"} onPress={() => setFilter("unlocked")} />
          <Chip label={`Locked ${counts.locked}`} active={filter === "locked"} onPress={() => setFilter("locked")} />
        </View>
      )}

      {!hasAchievements && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {progress === null
              ? "Achievements not loaded for this game"
              : "This game has no achievements"}
          </Text>
          {progress === null && (
            <Text style={styles.emptyHint}>
              the schema and your unlocks load on first open
            </Text>
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
              <Text style={styles.emptyTitle}>Nothing unlocked yet</Text>
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <GameTemplate header={header} rows={rows} initialRows={ACHIEVEMENTS_INITIAL_ROWS} />
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
