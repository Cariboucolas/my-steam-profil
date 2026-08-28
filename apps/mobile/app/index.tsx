import type { GameDto, ProfileDto } from "@steam/contracts";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ApiClient } from "../src/api-client/api-client";
import { useApiClient } from "../src/api-client/use-api-client";
import { useLibraryTallies } from "../src/api-client/use-library-tallies";
import { GameListItem } from "../src/components/molecules/GameListItem";
import { SortChips } from "../src/components/molecules/SortChips";
import { ErrorState } from "../src/components/organisms/ErrorState";
import { LibraryStatsCard } from "../src/components/organisms/LibraryStatsCard";
import { ProfileHeader } from "../src/components/organisms/ProfileHeader";
import { useSteamId } from "../src/settings/steam-id-store";
import { colors, spacing } from "../src/theme/tokens";
import { messageFor } from "../src/view-models/api-errors";
import {
  buildLibraryRows,
  buildLibrarySummary,
  type LibrarySort,
  type LibraryView,
} from "../src/view-models/library";

type Loaded = {
  /** Which client answered, so a profile switch invalidates these at once. */
  readonly client: ApiClient;
  readonly profile: ProfileDto;
  readonly games: readonly GameDto[];
};
type State =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: Loaded };

/**
 * One array for every render that has no library yet. A literal here would be
 * a new array each time, and the tallies are loaded off this identity: the
 * load would restart for as long as the screen kept rendering.
 */
const NO_GAMES: readonly GameDto[] = [];

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state: steamId } = useSteamId();
  const apiClient = useApiClient();
  const [state, setState] = useState<State>({ status: "loading" });
  const [sort, setSort] = useState<LibrarySort>("completed");
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

      // The library shows as soon as it arrives; tallies fill in after, rather
      // than holding the whole screen back for several hundred of them.
      setState({
        status: "ready",
        data: { client: apiClient, profile: profile.value, games: games.value },
      });
    };

    void load();
    // Guards against a state update once the screen has gone away.
    return () => {
      cancelled = true;
    };
  }, [apiClient, reloadNonce]);

  // Only the games this very client loaded. On the render where the profile
  // has just changed, the previous library is still in state, and effects all
  // run before that render's reset does: handing it over would spend a wave of
  // requests on the wrong profile's games.
  const games =
    state.status === "ready" && state.data.client === apiClient
      ? state.data.games
      : NO_GAMES;

  // Where the tallies have got to. Fetching them, bounding them, abandoning
  // them on a profile switch and holding the list still while they land are
  // all its concern, and none of them are state this screen keeps.
  const { completions, pending, frozenOrder, repin } = useLibraryTallies(
    apiClient,
    games,
  );

  // Named, now that both builders read it: a missing field fails to compile
  // rather than quietly satisfying one caller and not the other.
  const view = useMemo<LibraryView>(
    () => ({ games, completions, sort, pending, frozenOrder }),
    [games, completions, sort, pending, frozenOrder],
  );
  const rows = useMemo(() => buildLibraryRows(view), [view]);
  const summary = useMemo(() => buildLibrarySummary(view), [view]);

  /**
   * Choosing an order is a request to see things move, so the list re-sorts at
   * once — and then re-pins to the result, so the waves still arriving do not
   * carry on shuffling it afterwards. Movement happens when the reader asks for
   * it, and at no other time.
   */
  const chooseSort = useCallback(
    (next: LibrarySort) => {
      setSort(next);
      repin(
        buildLibraryRows({ ...view, sort: next, frozenOrder: null }).map(
          (row) => row.appId,
        ),
      );
    },
    [view, repin],
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
    // Two ways out, because the message covers two kinds of failure and this
    // screen renders no header. A backend that was down may now be up, so
    // retrying the same profile has to be possible; a profile that does not
    // exist will never load, so changing it has to be possible. Without both,
    // the only recovery is killing the app.
    return (
      <ErrorState
        message={state.message}
        onRetry={() => setReloadNonce((previous) => previous + 1)}
        onChangeProfile={() => router.push("/setup")}
      />
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
          <SortChips active={sort} onSelect={chooseSort} />
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
});
