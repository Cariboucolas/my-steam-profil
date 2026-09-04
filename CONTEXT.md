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

**UnlockState**:
Whether a player has earned an Achievement, and when. Exactly two shapes: unlocked with a date, or locked.
_Avoid_: Achieved, Completed, Status

**Timeline**:
A player's unlocked achievements for one Game, ordered by when they were earned.
_Avoid_: History, Chronology, Feed

**CompletionRate**:
The share of a Game's achievements a player has unlocked. Always between 0 and 100.
_Avoid_: Percentage, Progress, Score

**GameCompletion**:
The tally: how many achievements a player has unlocked, out of how many **the Game defines**, and the resulting CompletionRate.
_Avoid_: Progress, Stats, Summary

**GameProgress**:
Everything there is to say about one player in one Game: its GameCompletion, its achievements with their UnlockState, and their Timeline.
_Avoid_: GameAchievements, Game stats, Game detail

**UnlockDay**:
One calendar day, in the player's own time zone, and how many achievements they unlocked across their whole library that day. A day with none is a real UnlockDay counting zero; a day that has not arrived, or that never existed — 31 February — is not one at all. An achievement Steam will not date falls on no UnlockDay: it is counted in its GameCompletion and appears nowhere on the calendar.
_Avoid_: Bucket, Cell, Entry

**UnlockMonth**:
One calendar month of a year, and its UnlockDays. A month already begun holds every day up to today and no further; a month still to come is not an UnlockMonth at all. It knows its own total, the one number the calendar states outright instead of in tone.
_Avoid_: Row, Bucket, Period

**UnlockCalendar**:
Every UnlockMonth of one year — how a player's unlocking is spread over that year, across the whole library rather than one Game. Unlike a Timeline it does not say **which** achievement was earned, only how many and when. It shows the year in progress; earlier years belong to a statistics view, not to this one.
_Avoid_: Timeline (that is one Game's, and it names its achievements), Heatmap and Activity (what the screen calls it, not what it is), Graph

**LastYearsTotal**:
How many achievements the player unlocked in the whole of the previous calendar year. Set beside the year in progress it is a target, not a measurement — a finished year against a running one, deliberately. Written "all of 2025" wherever it is shown, because the two spans are unequal on purpose and must not be read like for like.
_Avoid_: YearOverYear (it promises equal spans), UnlockPace, Trend
