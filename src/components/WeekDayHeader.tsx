"use client";

import { formatEstimateMinutes } from "@/lib/format";
import { formatWorkloadWarning } from "@/lib/utils/workload";
import { DEFAULT_TIMEZONE } from "@/lib/utils/tz";

type WeekDayHeaderProps = {
  date: string;
  totalMinutes: number;
  taskCount: number;
  ceilingMinutes: number;
  expanded: boolean;
  onToggle: () => void;
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
  expanded,
  onToggle,
}: WeekDayHeaderProps) {
  const overbooked = totalMinutes > ceilingMinutes;
  const dueLabel = taskCount === 1 ? "1 due" : `${taskCount} due`;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded text-left hover:bg-zinc-50/80"
        aria-expanded={expanded}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 py-0.5">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900">
            <span className="w-3 shrink-0 text-center text-xs text-zinc-500" aria-hidden>
              {expanded ? "▾" : "▸"}
            </span>
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
      </button>
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
