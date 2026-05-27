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

type TaskFilterBarProps = {
  active: TaskFilter;
  onChange: (filter: TaskFilter) => void;
};

export function TaskFilterBar({ active, onChange }: TaskFilterBarProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {TASK_FILTERS.map((filter) => (
        <FilterChip
          key={filter}
          label={filter}
          active={active === filter}
          onClick={() => onChange(filter)}
        />
      ))}
    </div>
  );
}

export function filterIndexToFilter(index: number): TaskFilter | null {
  if (index < 1 || index > TASK_FILTERS.length) return null;
  return TASK_FILTERS[index - 1];
}
