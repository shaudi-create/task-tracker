"use client";

import { formatEstimateMinutes } from "@/lib/format";
import { formatWorkloadWarning } from "@/lib/utils/workload";
import { DEFAULT_TIMEZONE } from "@/lib/utils/tz";

type WeekDayHeaderProps = {
  date: string;
  totalMinutes: number;
  taskCount: number;
  ceilingMinutes: number;
};

function formatAgendaHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function WeekDayHeader({
  date,
  totalMinutes,
  taskCount,
  ceilingMinutes,
}: WeekDayHeaderProps) {
  const overbooked = totalMinutes > ceilingMinutes;
  const dueLabel = taskCount === 1 ? "1 due" : `${taskCount} due`;

  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">
          {formatAgendaHeading(date)}
        </h2>
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">
            Total: {formatEstimateMinutes(totalMinutes)}
          </span>
          {" · "}
          {dueLabel}
        </p>
      </div>
      {overbooked && (
        <p
          className="mt-2 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          {formatWorkloadWarning({
            totalMinutes,
            ceilingMinutes,
          })}
        </p>
      )}
    </div>
  );
}
