import type { AchievementDto, GameDto, GameProgressDto } from "@steam/contracts";

import { formatDay } from "./library";

export type AchievementFilter = "all" | "unlocked" | "locked";

export type AchievementRow = {
  readonly apiName: string;
  readonly name: string;
  readonly description: string;
  readonly iconUrl: string;
  readonly unlocked: boolean;
  readonly dateLabel: string;
};

export type TimelineItem = {
  readonly apiName: string;
  readonly name: string;
  readonly iconUrl: string;
  readonly timeLabel: string;
};

export type TimelineDay = {
  readonly key: string;
  readonly day: string;
  readonly year: string;
  readonly countLabel: string;
  readonly items: readonly TimelineItem[];
};

export type GameSummary = {
  readonly percentage: number | null;
  readonly rateLabel: string;
  readonly fraction: string;
  readonly remaining: string;
  readonly lastUnlock: string;
  readonly meta: string;
};

export type FilterCounts = {
  readonly all: number;
  readonly unlocked: number;
  readonly locked: number;
};

/** Steam leaves the description empty on achievements hidden until earned. */
const NO_DESCRIPTION = "Hidden achievement — no description";

const pad = (value: number): string => String(value).padStart(2, "0");

/** "22:09", in the device's own time zone. */
const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const earnedAt = (achievement: AchievementDto): number =>
  achievement.unlockedAt ? Date.parse(achievement.unlockedAt) : -Infinity;

export const buildFilterCounts = (progress: GameProgressDto): FilterCounts => {
  const all = progress.achievements.length;
  const unlocked = progress.achievements.filter((a) => a.unlocked).length;
  return { all, unlocked, locked: all - unlocked };
};

export const buildAchievementRows = (
  progress: GameProgressDto,
  filter: AchievementFilter,
): readonly AchievementRow[] =>
  progress.achievements
    .filter((a) =>
      filter === "unlocked" ? a.unlocked : filter === "locked" ? !a.unlocked : true,
    )
    // Most recently earned first; anything locked settles at the bottom.
    .slice()
    .sort((a, b) => earnedAt(b) - earnedAt(a))
    .map((a) => ({
      apiName: a.apiName,
      name: a.displayName,
      description: a.description === "" ? NO_DESCRIPTION : a.description,
      // The grey icon is what Steam ships for an achievement not yet earned.
      iconUrl: a.unlocked ? a.icon : a.iconGray,
      unlocked: a.unlocked,
      dateLabel: a.unlockedAt ? formatDay(a.unlockedAt) : "locked",
    }));

export const buildTimelineDays = (
  progress: GameProgressDto,
): readonly TimelineDay[] => {
  const byName = new Map(progress.achievements.map((a) => [a.apiName, a]));
  const days = new Map<string, TimelineItem[]>();

  // Newest first, so both the days and each day's rows come out that way.
  const entries = [...progress.timeline].sort(
    (a, b) => Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt),
  );

  for (const entry of entries) {
    const achievement = byName.get(entry.apiName);
    if (!achievement) {
      // The timeline names an achievement the schema does not define; the
      // mapper already drops those, so this is belt and braces.
      continue;
    }
    const key = formatDay(entry.unlockedAt);
    const items = days.get(key) ?? [];
    items.push({
      apiName: entry.apiName,
      name: achievement.displayName,
      iconUrl: achievement.icon,
      timeLabel: formatTime(entry.unlockedAt),
    });
    days.set(key, items);
  }

  return [...days.entries()].map(([key, items]) => {
    // "24 Jun 2026" splits into the day line and the year beneath it.
    const parts = key.split(" ");
    const year = parts.pop() ?? "";
    return {
      key,
      day: parts.join(" "),
      year,
      countLabel: `${items.length} unlocked`,
      items,
    };
  });
};

export const buildGameSummary = (
  game: GameDto,
  progress: GameProgressDto,
): GameSummary => {
  const { unlocked, total, percentage } = progress.completion;
  const known = total > 0;
  const left = Math.max(0, total - unlocked);
  const lastUnlockAt = progress.timeline.reduce<string | null>(
    (latest, entry) =>
      latest === null || Date.parse(entry.unlockedAt) > Date.parse(latest)
        ? entry.unlockedAt
        : latest,
    null,
  );

  return {
    percentage: known ? Math.round(percentage) : null,
    rateLabel: known ? `${Math.round(percentage)}%` : "—",
    fraction: known ? `${unlocked} / ${total}` : "no achievements",
    remaining: known
      ? `${left} ${left === 1 ? "achievement" : "achievements"} remaining`
      : "",
    lastUnlock: lastUnlockAt ? `last unlock ${formatDay(lastUnlockAt)}` : "",
    meta: `${game.playtimeLabel} played · last played ${
      game.lastPlayedAt ? formatDay(game.lastPlayedAt) : "never"
    }`,
  };
};
