import type { GameDto, ProfileDto } from "@steam/contracts";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ApiClient } from "../src/api-client/api-client";
import { useApiClient } from "../src/api-client/use-api-client";
import type { CountedLibrary } from "../src/api-client/use-library-rarity";
import { useLibraryTallies } from "../src/api-client/use-library-tallies";
import { Tabs } from "../src/components/atoms/Tabs";
import { GameListItem } from "../src/components/molecules/GameListItem";
import { RarestRow } from "../src/components/molecules/RarestRow";
import { SortChips } from "../src/components/molecules/SortChips";
import { ErrorState } from "../src/components/organisms/ErrorState";
import { LibraryStatsCard } from "../src/components/organisms/LibraryStatsCard";
import { ProfileHeader } from "../src/components/organisms/ProfileHeader";
import { UnlockCalendarCard } from "../src/components/organisms/UnlockCalendarCard";
import { useSteamId } from "../src/settings/steam-id-store";
import { colors, fonts, spacing } from "../src/theme/tokens";
import { messageFor } from "../src/view-models/api-errors";
import {
  buildLibraryRows,
  buildLibrarySummary,
  type LibrarySort,
  type LibraryView,
} from "../src/view-models/library";
import { useRarestTab, type RarestTab } from "../src/view-models/use-rarest-tab";
import { useUnlockCalendar } from "../src/view-models/use-unlock-calendar";

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

/**
 * The two things this screen can be a list of. Completion is the library and
 * the tab the screen opens on; Rarest ranks what the player has unlocked across
 * all of it, and costs a load nobody has asked for until they open it.
 */
const TABS = ["Completion", "Rarest"] as const;
const COMPLETION = 0;
const RAREST = 1;

/**
 * What stands in for the ranking while there is none, told apart because the
 * two silences are not the same news. A tab still waiting on the count would
 * otherwise look exactly like a player who has unlocked nothing anywhere.
 *
 * Phase one running with nothing ranked yet says nothing at all: the card's
 * load bar is already saying it, and a message that appeared for a second
 * between two states would only be read as a third.
 */
const rarestEmptyFor = (status: RarestTab["status"]) => {
  if (status === "counting") {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Counting your library first</Text>
        <Text style={styles.emptyHint}>
          the rarest unlocks are ranked across every game you have played
        </Text>
      </View>
    );
  }
  if (status === "ready") {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nothing unlocked in any game yet</Text>
      </View>
    );
  }
  return null;
};

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state: steamId } = useSteamId();
  const apiClient = useApiClient();
  const [state, setState] = useState<State>({ status: "loading" });
  const [sort, setSort] = useState<LibrarySort>("completed");
  const [tab, setTab] = useState(COMPLETION);
  // Bumped to re-run the load when nothing else about the request changed —
  // a backend that was down and may now be up. The api client is memoised on
  // the steam id, so without this a retry with the same profile is a no-op.
  const [reloadNonce, setReloadNonce] = useState(0);
  // Today, read once when the screen opens. The calendar is a statement about
  // today, so it takes one — and a fresh Date on every render would rebuild the
  // whole year on every render.
  const [today] = useState(() => new Date());

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

  // What the screen draws: the library in hand, until the next one arrives.
  const games = state.status === "ready" ? state.data.games : NO_GAMES;

  // What gets counted: only the games this very client answered for. On the
  // render where the profile has just changed, the previous library is still in
  // state and every effect runs before that render's reset does, so counting
  // what is drawn would spend a wave of requests on the wrong profile's games.
  const gamesToCount =
    state.status === "ready" && state.data.client === apiClient
      ? games
      : NO_GAMES;

  // Where the tallies have got to. Fetching them, bounding them, abandoning
  // them on a profile switch and holding the list still while they land are
  // all its concern, and none of them are state this screen keeps.
  const { tallies, pending, counted, loaded, frozenOrder, repin } =
    useLibraryTallies(apiClient, gamesToCount);

  // Named, now that both builders read it: a missing field fails to compile
  // rather than quietly satisfying one caller and not the other.
  const view = useMemo<LibraryView>(
    () => ({ games, tallies, sort, pending, frozenOrder }),
    [games, tallies, sort, pending, frozenOrder],
  );
  const rows = useMemo(() => buildLibraryRows(view), [view]);
  const summary = useMemo(() => buildLibrarySummary(view), [view]);
  // The tones hold still while the waves land, which is the hook's own doing
  // and not this screen's: it is the calendar's half of what `frozenOrder` is
  // to the list below.
  const calendar = useUnlockCalendar(view, today);

  /**
   * The pair the rarest ranking is fetched against, and null until there is
   * one. Which games hold an unlock is what the count delivers, and the two
   * loads share the same six connections — so this stays null until the count
   * is through, which is the whole of what makes the tab wait.
   *
   * The tallies stop changing once `counted` is true, so this identity holds
   * still afterwards, which is what the loads behind it are started off.
   */
  const countedLibrary = useMemo<CountedLibrary | null>(
    () =>
      counted && apiClient !== undefined ? { client: apiClient, tallies } : null,
    [counted, apiClient, tallies],
  );
  const rarest = useRarestTab(countedLibrary, view, tab === RAREST);

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

  const padding = {
    paddingTop: insets.top + spacing.lg,
    paddingBottom: insets.bottom + 40,
  };

  const header = (
    <>
      <ProfileHeader
        profile={state.data.profile}
        gameCount={games.length}
        onChangeProfile={() => router.push("/setup")}
      />
      <LibraryStatsCard
        summary={summary}
        gameCount={games.length}
        // Both of the screen's loads report through the card's one bar: the
        // count first, and then the two phases behind the rarest ranking.
        loaded={loaded ?? rarest.loaded}
      />
      <UnlockCalendarCard calendar={calendar} />
      <Tabs labels={TABS} activeIndex={tab} onSelect={setTab} />

      {/* The chips order the library, which is Completion's list and no other.
          A control with one sensible option is not a control, so on Rarest they
          give their place to what the ranking was ranked across. */}
      {tab === COMPLETION ? (
        <SortChips active={sort} onSelect={chooseSort} />
      ) : (
        rarest.status !== "counting" && (
          <Text style={styles.counted}>{rarest.countedLabel}</Text>
        )
      )}
    </>
  );

  if (tab === RAREST) {
    return (
      <FlatList
        style={styles.screen}
        data={rarest.rows}
        // An apiName is unique within its game and only within it.
        keyExtractor={(row) => `${row.appId}:${row.apiName}`}
        renderItem={({ item }) => <RarestRow row={item} onPress={openGame} />}
        contentContainerStyle={padding}
        ListHeaderComponent={header}
        ListEmptyComponent={rarestEmptyFor(rarest.status)}
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={rows}
      keyExtractor={(row) => String(row.appId)}
      renderItem={({ item }) => <GameListItem row={item} onPress={openGame} />}
      contentContainerStyle={padding}
      ListHeaderComponent={header}
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
  // Sits where the sort chips sit on the other tab, and reads like the stats
  // card's own fraction rather than like a heading.
  counted: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textDim,
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
