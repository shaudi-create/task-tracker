export const DEFAULT_TIMEZONE = "America/New_York";

/** Calendar date YYYY-MM-DD in America/New_York for the given instant. */
export function localDateString(ref: Date = new Date()): string {
  return ref.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIMEZONE });
}

/** Parse YYYY-MM-DD as a calendar date in America/New_York (midnight local). */
export function parseLocalDateString(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("date must be YYYY-MM-DD");
  }
  return dateStr;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** ISO 8601 with offset for the current instant in America/New_York. */
export function nowLocalIso(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour") === "24" ? "00" : get("hour");
  const minute = get("minute");
  const second = get("second");

  const utcGuess = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}Z`,
  );
  const asNy = new Date(
    utcGuess.toLocaleString("en-US", { timeZone: DEFAULT_TIMEZONE }),
  );
  const offsetMinutes = Math.round(
    (utcGuess.getTime() - asNy.getTime()) / 60_000,
  );
  const sign = offsetMinutes <= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offH = String(Math.floor(abs / 60)).padStart(2, "0");
  const offM = String(abs % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offH}:${offM}`;
}
