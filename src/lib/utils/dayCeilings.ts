import { DEFAULT_TIMEZONE } from "@/lib/utils/tz";

export const DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DEFAULT_DAY_CEILINGS: Record<DayKey, number> = {
  mon: 360,
  tue: 360,
  wed: 360,
  thu: 360,
  fri: 360,
  sat: 360,
  sun: 360,
};

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/** Map a local calendar date (YYYY-MM-DD, America/New_York) to mon–sun key. */
export function weekdayKeyForDate(dateStr: string): DayKey {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const short = date.toLocaleDateString("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "short",
  });
  return WEEKDAY_TO_KEY[short] ?? "mon";
}

export function ceilingForDate(
  dateStr: string,
  dayCeilings: Record<DayKey, number>,
  fallbackMinutes: number,
): number {
  const key = weekdayKeyForDate(dateStr);
  const value = dayCeilings[key];
  return typeof value === "number" && value > 0 ? value : fallbackMinutes;
}
