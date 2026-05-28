import { formatEstimateMinutes } from "@/lib/format";
import { localDateFromIso, localDateString } from "@/lib/utils/tz";

export const WORKLOAD_STATUSES = [
  "Scheduled",
  "In Progress",
  "Paused",
] as const;

type WorkloadTask = {
  status: string;
  estimate_minutes: number | null;
  scheduled_at: string | null;
};

/** Whether a task counts toward a day's workload total. */
export function taskCountsTowardWorkload(
  task: WorkloadTask,
  day: string,
): boolean {
  if (
    !WORKLOAD_STATUSES.includes(
      task.status as (typeof WORKLOAD_STATUSES)[number],
    )
  ) {
    return false;
  }

  if (task.status === "In Progress") {
    return day === localDateString();
  }

  return (
    task.scheduled_at != null && localDateFromIso(task.scheduled_at) === day
  );
}

export function sumWorkloadMinutesForDay(
  tasks: WorkloadTask[],
  day: string,
): number {
  return tasks
    .filter((t) => taskCountsTowardWorkload(t, day))
    .reduce((sum, t) => sum + (t.estimate_minutes ?? 0), 0);
}

/** @deprecated Use sumWorkloadMinutesForDay */
export function sumWorkloadMinutes(tasks: WorkloadTask[]): number {
  return sumWorkloadMinutesForDay(tasks, localDateString());
}

export function formatWorkloadWarning(
  params: {
    totalMinutes: number;
    ceilingMinutes: number;
  },
  options?: { today?: boolean },
): string {
  const overBy = params.totalMinutes - params.ceilingMinutes;
  const loadLabel = options?.today ? "today's load" : "load";
  return `Overbooked by ${formatEstimateMinutes(overBy)} — ${loadLabel} is ${formatEstimateMinutes(params.totalMinutes)}, ceiling is ${formatEstimateMinutes(params.ceilingMinutes)}.`;
}
