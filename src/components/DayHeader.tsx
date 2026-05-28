"use client";

import { formatEstimateMinutes } from "@/lib/format";
import { formatWorkloadWarning } from "@/lib/utils/workload";
import { DEFAULT_TIMEZONE } from "@/lib/utils/tz";

type TodayWorkload = {
  date: string;
  total_minutes: number;
  ceiling_minutes: number;
};

type DayHeaderProps = {
  workload: TodayWorkload | null;
  taskCount?: number;
  loading?: boolean;
};

function formatTodayHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DayHeader({ workload, taskCount = 0, loading }: DayHeaderProps) {
  const heading = workload
    ? formatTodayHeading(workload.date)
    : formatTodayHeading(
        new Date().toLocaleDateString("en-CA", {
          timeZone: DEFAULT_TIMEZONE,
        }),
      );

  const totalLabel = loading
    ? "…"
    : workload
      ? formatEstimateMinutes(workload.total_minutes)
      : "0m";

  const dueLabel = loading
    ? "…"
    : taskCount === 1
      ? "1 due"
      : `${taskCount} due`;

  const overbooked =
    workload != null && workload.total_minutes > workload.ceiling_minutes;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">Total: {totalLabel}</span>
          {" · "}
          {dueLabel}
        </p>
      </div>
      {overbooked && workload && (
        <p
          className="mt-2 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          {formatWorkloadWarning(
            {
              totalMinutes: workload.total_minutes,
              ceilingMinutes: workload.ceiling_minutes,
            },
            { today: true },
          )}
        </p>
      )}
    </div>
  );
}
