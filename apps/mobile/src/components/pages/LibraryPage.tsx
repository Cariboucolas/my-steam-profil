import type { GameDto, ProfileDto } from "@steam/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { ApiClient } from "../../api-client/api-client";
import { resolveRevision } from "../../api-client/config";
import { useApiClient } from "../../api-client/use-api-client";
import type { CountedLibrary } from "../../api-client/use-library-rarity";
import { useLibraryTallies } from "../../api-client/use-library-tallies";
import { useLocale } from "../../settings/locale-store";
import { colors, fonts, spacing } from "../../theme/tokens";
import { messageFor, type ScreenError } from "../../view-models/api-errors";
import {
  availableSorts,
  buildLibraryRows,
  buildLibrarySummary,
  type LibrarySort,
  type LibraryView,
  type PublishedFigures,
  publishesLastPlayed,
  publishesPlaytime,
} from "../../view-models/library";
import { useRarestTab } from "../../view-models/use-rarest-tab";
import { useUnlockCalendar } from "../../view-models/use-unlock-calendar";
import { LocaleToggle } from "../atoms/LocaleToggle";
import { Tabs } from "../atoms/Tabs";
import { GameListItem } from "../molecules/GameListItem";
import { RarestEmpty } from "../molecules/RarestEmpty";
import { RarestRow } from "../molecules/RarestRow";
import { SortChips } from "../molecules/SortChips";
import { WithheldFiguresNote } from "../molecules/WithheldFiguresNote";
import { ErrorState } from "../organisms/ErrorState";
import { LibraryStatsCard } from "../organisms/LibraryStatsCard";
import { ProfileHeader } from "../organisms/ProfileHeader";
import { UnlockCalendarCard } from "../organisms/UnlockCalendarCard";
import { LibraryTemplate } from "../templates/LibraryTemplate";

type Loaded = {
  /** Which client answered, so a profile switch invalidates these at once. */
  readonly client: ApiClient;
  readonly profile: ProfileDto;
  readonly games: readonly GameDto[];
};
type State =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: ScreenError }
  | { readonly status: "ready"; readonly data: Loaded };

/**
 * One array for every render that has no library yet. A literal here would be
 * a new array each time, and the tallies are loaded off this identity: the
 * load would restart for as long as the screen kept rendering.
 */
const NO_GAMES: readonly GameDto[] = [];

/**
 * What this bundle says it was built from. Written out rather than looked up,
 * and read once at module scope: Metro substitutes EXPO_PUBLIC_ variables at
 * build time, and only where they appear literally.
 */
const revision = resolveRevision(process.env.EXPO_PUBLIC_COMMIT_SHA, process.env.EXPO_PUBLIC_LIVE);

/**
 * The two things this screen can be a list of. Completion is the library and
 * the tab the screen opens on; Rarest ranks what the player has unlocked across
 * all of it, and costs a load nobody has asked for until they open it.
 */
const COMPLETION = 0;
const RAREST = 1;

/** Hundreds of rows: only what is on screen gets mounted. */
const LIBRARY_INITIAL_ROWS = 12;

type Props = {
  /** Where a row leads. The route knows the address; the page only knows the game. */
  readonly onOpenGame: (appId: number) => void;
  readonly onChangeProfile: () => void;
  /**
   * The day the calendar is a statement about. Left out, the day the page
   * opened on; a story names one, so the gallery does not repaint each morning
   * and a day like 1 January stays reachable (#75).
   */
  readonly today?: Date;
};

/**
 * The library: the one place it is loaded, and everything drawn from it
 * (ADR-0022). Knows nothing of the router — where a row or the profile control
 * leads is handed in — so it renders anywhere a client can be served.
 */
export function LibraryPage({ onOpenGame, onChangeProfile, today: givenToday }: Props) {
  const apiClient = useApiClient();
  const [state, setState] = useState<State>({ status: "loading" });
  const [chosenSort, setChosenSort] = useState<LibrarySort>("completed");
  const [tab, setTab] = useState(COMPLETION);
  // Bumped to re-run the load when nothing else about the request changed —
  // a backend that was down and may now be up. The api client is memoised on
  // the steam id, so without this a retry with the same profile is a no-op.
  const [reloadNonce, setReloadNonce] = useState(0);
  // Today, read once when the screen opens. The calendar is a statement about
  // today, so it takes one — and a fresh Date on every render would rebuild the
  // whole year on every render.
  const [today] = useState(() => givenToday ?? new Date());

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadNonce` re-runs the load and is read nowhere in it. Goes with it in #166.
  useEffect(() => {
    if (apiClient === undefined) {
      return;
    }
    let cancelled = false;

    // A different profile must not show the previous one's library while it
    // loads. Without this, switching profiles flashes the old data.
    setState({ status: "loading" });

    const load = async () => {
      const [profile, games] = await Promise.all([apiClient.getProfile(), apiClient.getGames()]);
      if (cancelled) return;

      if (!profile.ok) {
        setState({ status: "error", error: profile.error });
        return;
      }
      if (!games.ok) {
        setState({ status: "error", error: games.error });
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
    state.status === "ready" && state.data.client === apiClient ? games : NO_GAMES;

  // Where the tallies have got to. Fetching them, bounding them, abandoning
  // them on a profile switch and holding the list still while they land are
  // all its concern, and none of them are state this screen keeps.
  const { tallies, pending, counted, loaded, frozenOrder, repin } = useLibraryTallies(
    apiClient,
    gamesToCount,
  );

  // What Steam publishes about this library, which decides which orders exist
  // at all. Its own memo rather than part of `view`: it is read by the chips
  // and by the fallback below, neither of which builds rows.
  const published = useMemo<PublishedFigures>(
    () => ({
      playtime: publishesPlaytime(games),
      lastPlayed: publishesLastPlayed(games),
    }),
    [games],
  );

  // An order cannot outlive the chip that offers it. Choose "Most played",
  // change to a profile whose playtime Steam withholds, and the chosen order
  // is over a figure that is gone — the list would sort on all-equal keys with
  // nothing on screen saying which order it is in. Derived rather than
  // corrected in state: a reader who moves back to a profile that publishes
  // the figure gets the order they chose, still chosen.
  const sort = availableSorts(published).includes(chosenSort) ? chosenSort : "completed";

  // Named, now that both builders read it: a missing field fails to compile
  // rather than quietly satisfying one caller and not the other.
  const view = useMemo<LibraryView>(
    () => ({ games, tallies, sort, pending, frozenOrder }),
    [games, tallies, sort, pending, frozenOrder],
  );
  // The view-models write the sentences; the page only hands them the language (ADR-0023).
  const { t } = useTranslation();
  const tabLabels = [t("library.tabs.completion"), t("library.tabs.rarest")];
  const { locale, choose } = useLocale();
  const rows = useMemo(() => buildLibraryRows(view, t), [view, t]);
  const summary = useMemo(() => buildLibrarySummary(view, t), [view, t]);
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
    () => (counted && apiClient !== undefined ? { client: apiClient, tallies } : null),
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
      setChosenSort(next);
      repin(
        buildLibraryRows({ ...view, sort: next, frozenOrder: null }, t).map((row) => row.appId),
      );
    },
    [view, repin, t],
  );

  const gameRows = useMemo(
    () =>
      rows.map((row) => <GameListItem key={String(row.appId)} row={row} onPress={onOpenGame} />),
    [rows, onOpenGame],
  );
  const rarestRows = useMemo(
    () =>
      rarest.rows.map((row) => (
        // An apiName is unique within its game and only within it.
        <RarestRow key={`${row.appId}:${row.apiName}`} row={row} onPress={onOpenGame} />
      )),
    [rarest.rows, onOpenGame],
  );

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
        message={messageFor(state.error, t)}
        onRetry={() => setReloadNonce((previous) => previous + 1)}
        onChangeProfile={onChangeProfile}
      />
    );
  }

  const header = (
    <>
      <ProfileHeader
        profile={state.data.profile}
        gameCount={games.length}
        revision={revision}
        onChangeProfile={onChangeProfile}
        languageSwitch={
          choose ? (
            <LocaleToggle active={locale} onSelect={(next) => void choose(next)} />
          ) : undefined
        }
      />
      <LibraryStatsCard
        summary={summary}
        gameCount={games.length}
        // Both of the screen's loads report through the card's one bar: the
        // count first, and then the figures the rarest ranking is built on.
        // The naming phase behind it reports nothing — see `RarestTab.loaded`.
        loaded={loaded ?? rarest.loaded}
      />
      <UnlockCalendarCard calendar={calendar} />
      <Tabs labels={tabLabels} activeIndex={tab} onSelect={setTab} />

      {/* The chips order the library, which is Completion's list and no other.
          A control with one sensible option is not a control, so on Rarest they
          give their place to what the ranking was ranked across — which is an
          assertion about a finished ranking, and waits for one. */}
      {tab === COMPLETION ? (
        <>
          <SortChips active={sort} onSelect={chooseSort} published={published} />
          <WithheldFiguresNote published={published} />
        </>
      ) : (
        rarest.status === "ready" && <Text style={styles.counted}>{rarest.countedLabel}</Text>
      )}
    </>
  );

  if (tab === RAREST) {
    return (
      <LibraryTemplate
        header={header}
        rows={rarestRows}
        empty={<RarestEmpty status={rarest.status} anyUnlock={rarest.anyUnlock} />}
      />
    );
  }

  return <LibraryTemplate header={header} rows={gameRows} initialRows={LIBRARY_INITIAL_ROWS} />;
}

const styles = StyleSheet.create({
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
});
