import { sql } from "@/lib/db/client";
import { DEFAULT_TIMEZONE, localDateString, parseLocalDateString } from "@/lib/utils/tz";

/** Sum of estimate_minutes for scheduled tasks on a local calendar day. */
export async function getDayScheduledWorkloadMinutes(
  dateStr?: string,
): Promise<number> {
  const anchor = dateStr ? parseLocalDateString(dateStr) : localDateString();

  const rows = await sql`
    SELECT COALESCE(SUM(estimate_minutes), 0)::int AS total
    FROM tasks
    WHERE status IN ('Scheduled', 'In Progress', 'Paused')
      AND scheduled_at IS NOT NULL
      AND (scheduled_at AT TIME ZONE ${DEFAULT_TIMEZONE})::date = ${anchor}::date
  `;

  return Number((rows[0] as { total: number }).total);
}

export async function getTodayScheduledWorkloadMinutes(): Promise<number> {
  return getDayScheduledWorkloadMinutes();
}
