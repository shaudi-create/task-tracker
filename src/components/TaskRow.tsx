"use client";

import { StatusDot } from "@/components/StatusDot";
import { WeatherWarning } from "@/components/WeatherWarning";
import { formatDueAt, formatEstimateMinutes } from "@/lib/format";
import { TaskStatus, type Task } from "@/lib/schemas/task";
import type { z } from "zod";

type TaskStatusValue = z.infer<typeof TaskStatus>;

type TaskRowProps = {
  task: Task;
  projectName?: string | null;
  onStatusChange: (status: TaskStatusValue) => void;
  onDone: () => void;
  onPause: () => void;
  onDelete: () => void;
  busy?: boolean;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        fill="currentColor"
        d="M13.2 3.2a1 1 0 0 1 1.4 1.4l-6.5 6.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 5.8-5.8z"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path fill="currentColor" d="M4 3h2v10H4V3zm6 0h2v10h-2V3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        fill="currentColor"
        d="M4.3 4.3a1 1 0 0 1 1.4 0L8 6.6l2.3-2.3a1 1 0 1 1 1.4 1.4L9.4 8l2.3 2.3a1 1 0 0 1-1.4 1.4L8 9.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L6.6 8 4.3 5.7a1 1 0 0 1 0-1.4z"
      />
    </svg>
  );
}

export function TaskRow({
  task,
  projectName,
  onStatusChange,
  onDone,
  onPause,
  onDelete,
  busy = false,
}: TaskRowProps) {
  const isDone = task.status === "Done";
  const isDropped = task.status === "Dropped";
  const showWeather = false; // v1: weather deferred (step 12)

  const metadata: string[] = [];
  if (task.due_at) metadata.push(formatDueAt(task.due_at));
  if (task.estimate_minutes != null) {
    metadata.push(formatEstimateMinutes(task.estimate_minutes));
  }
  if (projectName) metadata.push(projectName);

  return (
    <div className="group flex h-10 items-center gap-2 border-b border-zinc-100 px-3 text-sm">
      <StatusDot
        status={task.status}
        onStatusChange={onStatusChange}
        disabled={busy}
      />

      <span
        className={`min-w-0 flex-1 truncate ${
          isDone || isDropped ? "text-zinc-400" : "text-zinc-900"
        } ${isDropped ? "line-through" : ""}`}
        title={task.title}
      >
        {task.title}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {showWeather ? <WeatherWarning /> : null}
        {metadata.length > 0 && (
          <span className="hidden text-xs text-zinc-400 sm:inline">
            {metadata.join(" · ")}
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            disabled={busy || isDone || isDropped}
            onClick={onDone}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40"
            aria-label="Mark done"
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            disabled={busy || isDropped}
            onClick={onPause}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40"
            aria-label="Pause"
          >
            <PauseIcon />
          </button>
          <button
            type="button"
            disabled={busy || isDropped}
            onClick={onDelete}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 disabled:opacity-40"
            aria-label="Drop task"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
