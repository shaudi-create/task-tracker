export function formatEstimateMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const DISPLAY_TZ = "America/New_York";

export function formatDueAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    timeZone: DISPLAY_TZ,
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: DISPLAY_TZ,
    month: "short",
    day: "numeric",
  });
}

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: DISPLAY_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

/** True when ISO looks like date-only due (end-of-day from date picker). */
function isDueDateOnly(iso: string): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour === 23 && minute === 59;
}

export function formatDueChipLabel(iso: string): string {
  const datePart = formatShortDate(iso);
  if (isDueDateOnly(iso)) {
    return `Due ${datePart}`;
  }
  return `Due ${datePart}, ${formatShortTime(iso)}`;
}

export function formatSchedChipLabel(iso: string): string {
  return `Sched ${formatShortDate(iso)}, ${formatShortTime(iso)}`;
}
