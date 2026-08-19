import type { GameDto, ProfileDto } from "@steam/contracts";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient } from "../src/api-client";
import { GameListItem } from "../src/components/molecules/GameListItem";
import { SortChips } from "../src/components/molecules/SortChips";
import { LibraryStatsCard } from "../src/components/organisms/LibraryStatsCard";
import { ProfileHeader } from "../src/components/organisms/ProfileHeader";
import { fixtures } from "../src/fixtures";
import { colors, fonts, spacing } from "../src/theme/tokens";
import {
  buildLibraryRows,
  buildLibrarySummary,
  type LibrarySort,
} from "../src/view-models/library";

type Loaded = { readonly profile: ProfileDto; readonly games: readonly GameDto[] };
type State =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: Loaded };

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ status: "loading" });
  const [sort, setSort] = useState<LibrarySort>("closest");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [profile, games] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getGames(),
      ]);
      if (cancelled) return;

      if (!profile.ok) {
        setState({ status: "error", message: `Could not load the profile (${profile.error}).` });
        return;
      }
      if (!games.ok) {
        setState({ status: "error", message: `Could not load the library (${games.error}).` });
        return;
      }
      setState({ status: "ready", data: { profile: profile.value, games: games.value } });
    };

    void load();
    // Guards against a state update once the screen has gone away.
    return () => {
      cancelled = true;
    };
  }, []);

  const games = state.status === "ready" ? state.data.games : [];

  const rows = useMemo(
    () => buildLibraryRows(games, fixtures.progress, sort),
    [games, sort],
  );
  const summary = useMemo(
    () => buildLibrarySummary(games, fixtures.progress),
    [games],
  );

  const openGame = useCallback(
    (appId: number) => router.push(`/game/${appId}`),
    [router],
  );

  if (state.status === "loading") {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centred}>
        <Text style={styles.error}>{state.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={rows}
      keyExtractor={(row) => String(row.appId)}
      renderItem={({ item }) => <GameListItem row={item} onPress={openGame} />}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 40 }}
      ListHeaderComponent={
        <>
          <ProfileHeader profile={state.data.profile} gameCount={games.length} />
          <LibraryStatsCard summary={summary} gameCount={games.length} />
          <SortChips active={sort} onSelect={setSort} />
        </>
      }
      // 367 rows: only what is on screen gets mounted.
      initialNumToRender={12}
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
  centred: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
