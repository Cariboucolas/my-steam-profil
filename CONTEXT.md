# Steam Achievements

How far a player has got in the games they own on Steam. This context turns Steam's raw API shapes into a language about **progress** — what a game asks of you, and how much of it you have done.

## Language

**SteamId**:
A player's SteamID64, validated at construction: seventeen digits, nothing else.
_Avoid_: user id, account id, steam64

**Profile**:
A player as Steam presents them publicly — persona name, avatar, profile page. Identified by a SteamId.
_Avoid_: User, Account, Player (Steam's wire word, boundary only)

**Game**:
A title in a player's owned library, identified by its Steam appId, carrying the playtime that player has accumulated on it and when they last launched it.
_Avoid_: App, Title, Product

**Playtime**:
Total time a player has spent in a Game. Held in minutes, never negative.
_Avoid_: Hours played, Duration, Time spent

**Achievement**:
A single award a Game defines — display name, description, icons, and whether it is hidden until earned. Identified by its apiName **within its Game**; the same apiName means different awards in two different games.
_Avoid_: Trophy, Badge (a distinct Steam concept), Stat

**Rarity**:
Of the players who own a Game, the share who have unlocked one of its Achievements, as Steam publishes it — the base is Valve's, and we neither compute it nor audit it. Rarity belongs to the Achievement rather than to whoever is looking at it: every player reads the same figure. It runs 0 to 100 and reads backwards to every other percentage here — 0.4 is a trophy almost nobody holds, where a CompletionRate of 0.4 is a player who has barely started. Steam rounds it, so two Achievements can be published exactly equal, and a ranking that cuts between them cuts on nothing. An Achievement Steam publishes no figure for has no Rarity at all — not a Rarity of zero, which would rank it the rarest thing a player owns.
_Avoid_: Difficulty (Rarity is the proxy for it, never the thing), Popularity (the inverse), GlobalCompletion, Percentage

**UnlockState**:
Whether a player has earned an Achievement, and when. Exactly two shapes: unlocked with a date, or locked.
_Avoid_: Achieved, Completed, Status

**Unlock**:
One Achievement a player has earned, as the GameTally carries it: which one, and when. The date is missing where Steam flags the achievement earned and will not say when — that is Steam not knowing, never a January morning in 1970, and never a reason to leave the unlock out. Distinct from an UnlockState, which is the same fact seen from the Achievement and has no name of its own to give.
_Avoid_: Achievement (an Unlock is the earning of one, not the thing), Trophy, Entry

**Timeline**:
A player's unlocked achievements for one Game, ordered by when they were earned.
_Avoid_: History, Chronology, Feed

**CompletionRate**:
The share of a Game's achievements a player has unlocked. Always between 0 and 100.
_Avoid_: Percentage, Progress, Score

**GameCompletion**:
The tally: how many achievements a player has unlocked, out of how many **the Game defines**, and the resulting CompletionRate.
_Avoid_: Progress, Stats, Summary

**GameTally**:
What the app asks for per Game while it is counting a whole library: a GameCompletion, and the Unlocks it was counted from. Two named parts rather than one widened shape — a GameCompletion **is** the tally itself, and a tally carrying three hundred unlocks is no longer one (ADR-0006). It carried bare instants until ADR-0009 gave each one its name, without which a player's unlocks cannot be crossed with what Steam publishes about them.
_Avoid_: widening GameCompletion, Progress, History, Unlocks as a name for the whole (it names one of the two parts, never the tally)

**GameProgress**:
Everything there is to say about one player in one Game: its GameCompletion, its achievements with their UnlockState, and their Timeline.
_Avoid_: GameAchievements, Game stats, Game detail

**UnlockDay**:
One calendar day, in the player's own time zone, and how many achievements they unlocked across their whole library that day. A day with none is a real UnlockDay counting zero; a day that has not arrived, or that never existed — 31 February — is not one at all. An achievement Steam will not date falls on no UnlockDay: it is counted in its GameCompletion and appears nowhere on the calendar.
_Avoid_: Bucket, Cell, Entry

**UnlockTone**:
How dark an UnlockDay is drawn: the empty tile, or one of four strengths of the one accent. A tone says where that day sits among the player's own days, never how much it held — the count is what the UnlockMonth states outright. A day holding nothing takes the empty tile and has no tone from the scale at all.
_Avoid_: Level, Intensity, Heat, Shade

**UnlockToneBand**:
The counts one UnlockTone stands for, and how the legend writes them — `1-2`, `6-11`, `12+`. The five bands are the quartiles of the player's **active** days — those holding at least one unlock — over the 365 days ending today, a window that slides by a day a day and deliberately does not match the year the UnlockCalendar draws, so that no tone repaints on 1 January (ADR-0007). The bands are printed rather than suggested: a scale that does not match the picture has to be read, never inferred, so the legend states numbers and nowhere says "less" or "more".
_Avoid_: Threshold on its own (the bands are the player's own, not fixed), Bucket, Range, Ramp

**UnlockMonth**:
One calendar month of a year, and its UnlockDays. A month already begun holds every day up to today and no further; a month still to come is not an UnlockMonth at all. It knows its own total, the one number the calendar states outright instead of in tone.
_Avoid_: Row, Bucket, Period

**UnlockCalendar**:
Every UnlockMonth of one year — how a player's unlocking is spread over that year, across the whole library rather than one Game. Unlike a Timeline it does not say **which** achievement was earned, only how many and when. It shows the year in progress; earlier years belong to a statistics view, not to this one.
_Avoid_: Timeline (that is one Game's, and it names its achievements), Heatmap and Activity (what the screen calls it, not what it is), Graph

**LastYearsTotal**:
How many achievements the player unlocked in the whole of the previous calendar year. Set beside the year in progress it is a target, not a measurement — a finished year against a running one, deliberately. Written "all of 2025" wherever it is shown, because the two spans are unequal on purpose and must not be read like for like.
_Avoid_: YearOverYear (it promises equal spans), UnlockPace, Trend

**UnlockHeadline**:
The count of a player's unlocks across their whole library, as the library card writes it. Not the count itself — that is `LibrarySummary.unlocked` — but the promise made about writing it: it never breaks across two lines and is never truncated, because `4 127` split over two lines reads as two numbers and `4 1…` reads as a wrong one. It keeps that promise by being written in the most informative form that fits the room the screen leaves it — in full (`45 500`), then with one decimal and a unit (`45.5K`), then with neither (`45K`) — so its form belongs to the screen rather than to the number, and no threshold decides it (ADR-0011). The decimal mark follows the app's own language and never the device's; `K` and `M` are not translated (ADR-0010). Nothing is lost by shortening it: the fraction beneath states both halves in full, and the screen reader is always given the exact count.
_Avoid_: LibraryTally (GameTally already names the per-game shape, and this widens nothing), Total, Count, BigNumber
