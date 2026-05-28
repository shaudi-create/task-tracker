"use client";

import { FilterChip } from "@/components/FilterChip";
import { STATUS_DOT_BG } from "@/lib/statusColors";
import { TaskStatus } from "@/lib/schemas/task";
import type { z } from "zod";

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

type TaskStatusValue = z.infer<typeof TaskStatus>;

const FILTER_CHIPS: TasksViewFilter[] = ["Today", ...TASK_FILTERS];
const TASK_FILTER_CHIPS: TasksViewFilter[] = FILTER_CHIPS.filter(
  (f) => f !== "Inbox",
);

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
  return STATUS_DOT_BG[filter as TaskStatusValue];
}

export function TaskFilterBar({ active, onChange }: TaskFilterBarProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {TASK_FILTER_CHIPS.map((filter) => (
        <FilterChip
          key={filter}
          label={filter}
          prefix={
            statusDotClass(filter, active === filter) ? (
              <span
                className={`pointer-events-none inline-block h-1.5 w-1.5 rounded-full ${statusDotClass(filter, active === filter)}`}
                aria-hidden
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
  if (index < 1 || index > TASK_FILTER_CHIPS.length) return null;
  return TASK_FILTER_CHIPS[index - 1];
}
