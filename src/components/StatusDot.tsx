"use client";

import { TaskStatus } from "@/lib/schemas/task";
import type { z } from "zod";

type TaskStatusValue = z.infer<typeof TaskStatus>;

const ALL_STATUSES = TaskStatus.options;

const statusColor: Record<TaskStatusValue, string> = {
  Inbox: "bg-zinc-400",
  Backlog: "bg-zinc-400",
  Scheduled: "bg-blue-500",
  "In Progress": "bg-[#5E6AD2]",
  Paused: "bg-[#F59E0B]",
  Done: "bg-green-500",
  Dropped: "bg-zinc-400",
};

type StatusDotProps = {
  status: TaskStatusValue;
  onStatusChange: (status: TaskStatusValue) => void;
  disabled?: boolean;
};

export function StatusDot({
  status,
  onStatusChange,
  disabled = false,
}: StatusDotProps) {
  return (
    <div className="relative h-4 w-4 shrink-0">
      <span
        className={`pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${statusColor[status]}`}
        aria-hidden
      />
      <select
        value={status}
        disabled={disabled}
        onChange={(e) => onStatusChange(e.target.value as TaskStatusValue)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Change task status"
      >
        {ALL_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}
