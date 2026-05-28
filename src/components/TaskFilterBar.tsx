"use client";

import { FilterChip } from "@/components/FilterChip";

export const TASK_FILTERS = [
  "All",
  "Inbox",
  "Backlog",
  "Scheduled",
  "In Progress",
  "Paused",
  "Done",
  "Dropped",
] as const;

export type TaskFilter = (typeof TASK_FILTERS)[number];

export type TasksViewFilter = "Today" | TaskFilter;

const FILTER_CHIPS: TasksViewFilter[] = ["Today", ...TASK_FILTERS];

type TaskFilterBarProps = {
  active: TasksViewFilter;
  onChange: (filter: TasksViewFilter) => void;
};

function statusDotClass(
  filter: TasksViewFilter,
  active: boolean,
): string | null {
  if (filter === "All" || filter === "Today") return null;
  if (active) return "bg-white";
  if (filter === "Inbox" || filter === "Backlog") return "bg-zinc-400";
  if (filter === "Scheduled") return "bg-blue-500";
  if (filter === "In Progress") return "bg-[#5E6AD2]";
  if (filter === "Paused") return "bg-[#F59E0B]";
  if (filter === "Done") return "bg-green-500";
  if (filter === "Dropped") return "bg-zinc-400";
  return null;
}

export function TaskFilterBar({ active, onChange }: TaskFilterBarProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {FILTER_CHIPS.map((filter) => (
        <FilterChip
          key={filter}
          label={filter}
          prefix={
            statusDotClass(filter, active === filter) ? (
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusDotClass(filter, active === filter)}`}
              />
            ) : undefined
          }
          active={active === filter}
          onClick={() => onChange(filter)}
        />
      ))}
    </div>
  );
}

export function filterIndexToFilter(index: number): TasksViewFilter | null {
  if (index < 1 || index > FILTER_CHIPS.length) return null;
  return FILTER_CHIPS[index - 1];
}
