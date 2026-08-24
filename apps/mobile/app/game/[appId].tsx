import type { GameDto, GameProgressDto } from "@steam/contracts";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApiClient } from "../../src/api-client/use-api-client";
import { Chip } from "../../src/components/atoms/Chip";
import { Tabs } from "../../src/components/atoms/Tabs";
import { AchievementRow } from "../../src/components/molecules/AchievementRow";
import { TimelineDayRow } from "../../src/components/molecules/TimelineDayRow";
import { CompletionSummary } from "../../src/components/organisms/CompletionSummary";
import { ErrorState } from "../../src/components/organisms/ErrorState";
import { GameHero } from "../../src/components/organisms/GameHero";
import { useSteamId } from "../../src/settings/steam-id-store";
import { colors, fonts, spacing } from "../../src/theme/tokens";
import { messageFor } from "../../src/view-models/api-errors";
import {
  buildAchievementRows,
  buildFilterCounts,
  buildGameSummary,
  buildTimelineDays,
  type AchievementFilter,
} from "../../src/view-models/game-progress";

type Loaded = { readonly game: GameDto; readonly progress: GameProgressDto | null };
type State =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: Loaded };

const TABS = ["Achievements", "Timeline"] as const;

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Expo Router passes route params through the URL, so this is a string even
  // though the route reads like a number.
  const { appId: appIdParam } = useLocalSearchParams<{ appId: string }>();
  const appId = Number.parseInt(appIdParam ?? "", 10);

  const { state: steamId } = useSteamId();
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

      const game = games.value.find((candidate) => candidate.appId === appId);
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
    () => (progress ? buildAchievementRows(progress, filter) : []),
    [progress, filter],
  );
  const days = useMemo(() => (progress ? buildTimelineDays(progress) : []), [progress]);

  if (steamId.status === "absent") {
    return <Redirect href="/setup" />;
  }

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
        onChangeProfile={() => router.push("/setup")}
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
        onBack={() => router.back()}
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

  const bottom = { paddingBottom: insets.bottom + 40 };

  if (tab === 1) {
    return (
      <FlatList
        style={styles.screen}
        data={days}
        keyExtractor={(day) => day.key}
        renderItem={({ item }) => <TimelineDayRow day={item} />}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.headerBlock}
        contentContainerStyle={bottom}
        ListEmptyComponent={
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
    <FlatList
      style={styles.screen}
      data={rows}
      keyExtractor={(row) => row.apiName}
      renderItem={({ item }) => <AchievementRow row={item} />}
      ListHeaderComponent={header}
      contentContainerStyle={bottom}
      // Soulstone Survivors alone defines 483 of these.
      initialNumToRender={10}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBlock: {
    paddingBottom: spacing.xl,
  },
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
