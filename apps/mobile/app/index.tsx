import type { GameDto, ProfileDto } from "@steam/contracts";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApiClient } from "../src/api-client/use-api-client";
import { loadLibraryProgress } from "../src/api-client/library-progress";
import { GameListItem } from "../src/components/molecules/GameListItem";
import { SortChips } from "../src/components/molecules/SortChips";
import { LibraryStatsCard } from "../src/components/organisms/LibraryStatsCard";
import { ProfileHeader } from "../src/components/organisms/ProfileHeader";
import { useSteamId } from "../src/settings/steam-id-store";
import { colors, fonts, radius, spacing } from "../src/theme/tokens";
import { messageFor } from "../src/view-models/api-errors";
import {
  buildLibraryRows,
  buildLibrarySummary,
  type LibrarySort,
  type ProgressByAppId,
} from "../src/view-models/library";

/**
 * Completion costs one backend call per game, so the screen loads it for the
 * handful played most recently. Everything else shows a dash until opened.
 */
const GAMES_TO_LOAD_PROGRESS_FOR = 12;

type Loaded = { readonly profile: ProfileDto; readonly games: readonly GameDto[] };
type State =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: Loaded };

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state: steamId } = useSteamId();
  const apiClient = useApiClient();
  const [state, setState] = useState<State>({ status: "loading" });
  const [progress, setProgress] = useState<ProgressByAppId>({});
  const [sort, setSort] = useState<LibrarySort>("closest");
  // Bumped to re-run the load when nothing else about the request changed —
  // a backend that was down and may now be up. The api client is memoised on
  // the steam id, so without this a retry with the same profile is a no-op.
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (apiClient === undefined) {
      return;
    }
    let cancelled = false;

    // A different profile must not show the previous one's library while it
    // loads. Without this, switching profiles flashes the old data.
    setState({ status: "loading" });
    setProgress({});

    const load = async () => {
      const [profile, games] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getGames(),
      ]);
      if (cancelled) return;

      if (!profile.ok) {
        setState({ status: "error", message: messageFor(profile.error) });
        return;
      }
      if (!games.ok) {
        setState({ status: "error", message: messageFor(games.error) });
        return;
      }

      // The library shows as soon as it arrives; completion fills in after,
      // rather than holding the whole screen back for it.
      setState({ status: "ready", data: { profile: profile.value, games: games.value } });

      const loaded = await loadLibraryProgress(
        apiClient,
        games.value,
        GAMES_TO_LOAD_PROGRESS_FOR,
      );
      if (!cancelled) {
        setProgress(loaded);
      }
    };

    void load();
    // Guards against a state update once the screen has gone away.
    return () => {
      cancelled = true;
    };
  }, [apiClient, reloadNonce]);

  const games = state.status === "ready" ? state.data.games : [];

  const rows = useMemo(
    () => buildLibraryRows(games, progress, sort),
    [games, progress, sort],
  );
  const summary = useMemo(
    () => buildLibrarySummary(games, progress),
    [games, progress],
  );

  const openGame = useCallback(
    (appId: number) => router.push(`/game/${appId}`),
    [router],
  );

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
    return (
      <View style={styles.centred}>
        <Text style={styles.error}>{state.message}</Text>
        {/*
         * Two ways out, because the message covers two kinds of failure and
         * this screen renders no header. A backend that was down may now be
         * up, so retrying the same profile has to be possible; a profile that
         * does not exist will never load, so changing it has to be possible.
         * Without both, the only recovery is killing the app.
         */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => setReloadNonce((previous) => previous + 1)}
          style={styles.recover}
        >
          <Text style={styles.recoverLabel}>Try again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile"
          onPress={() => router.push("/setup")}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>Change profile</Text>
        </Pressable>
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
          <ProfileHeader
            profile={state.data.profile}
            gameCount={games.length}
            onChangeProfile={() => router.push("/setup")}
          />
          <LibraryStatsCard summary={summary} gameCount={games.length} />
          <SortChips active={sort} onSelect={setSort} />
        </>
      }
      // Hundreds of rows: only what is on screen gets mounted.
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
    lineHeight: 21,
  },
  recover: {
    marginTop: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  recoverLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.accent,
  },
  secondary: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textDim,
  },
});
