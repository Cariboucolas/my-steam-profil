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
A title in a player's owned library, identified by its Steam appId, carrying the playtime that player has accumulated on it.
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
