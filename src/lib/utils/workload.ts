import { formatEstimateMinutes } from "@/lib/format";

export const WORKLOAD_STATUSES = [
  "Scheduled",
  "In Progress",
  "Paused",
] as const;

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

export function sumWorkloadMinutes(
  tasks: { status: string; estimate_minutes: number | null }[],
): number {
  return tasks
    .filter((t) =>
      WORKLOAD_STATUSES.includes(
        t.status as (typeof WORKLOAD_STATUSES)[number],
      ),
    )
    .reduce((sum, t) => sum + (t.estimate_minutes ?? 0), 0);
}
