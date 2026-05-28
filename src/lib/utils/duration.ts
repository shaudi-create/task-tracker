const MINUTES_PER_HOUR = 60;

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Parse natural duration phrases into minutes.
 *
 * Supported:
 * - "2 hours", "1.5h", "1 hr", "an hour", "half hour", "quarter hour"
 * - "30m", "30 min", "ninety minutes"
 * - "1h 30m", "1.5 hours"
 * - pure numeric => minutes
 */
export function parseDurationMinutes(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  // Common phrases
  if (raw === "all day") return 480;
  if (raw === "an hour" || raw === "a hour") return 60;
  if (raw === "half hour" || raw === "a half hour") return 30;
  if (raw === "quarter hour" || raw === "a quarter hour") return 15;
  if (raw === "ninety minutes") return 90;

  // "1h 30m" / "1.5h30m"
  const hm = raw.match(
    /^\s*(\d+(?:\.\d+)?)\s*h(?:ours?|rs?|r)?\s*(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?\s*$/,
  );
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return roundToNearest5(h * MINUTES_PER_HOUR + m);
  }

  // "<n> hours"
  const hours = raw.match(
    /^\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\s*$/,
  );
  if (hours) {
    const n = Number(hours[1]);
    if (!Number.isFinite(n)) return null;
    return roundToNearest5(n * MINUTES_PER_HOUR);
  }

  // "<n> minutes"
  const mins = raw.match(
    /^\s*(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\s*$/,
  );
  if (mins) {
    const n = Number(mins[1]);
    if (!Number.isFinite(n)) return null;
    return roundToNearest5(n);
  }

  // Pure numeric => minutes
  const numeric = raw.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
  if (numeric) {
    const n = Number(numeric[1]);
    if (!Number.isFinite(n)) return null;
    return roundToNearest5(n);
  }

  return null;
}

