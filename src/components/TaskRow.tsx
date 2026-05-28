"use client";

import { StatusDot } from "@/components/StatusDot";
import { WeatherWarning } from "@/components/WeatherWarning";
import { formatDueAt, formatEstimateMinutes } from "@/lib/format";
import { TaskStatus, type Task } from "@/lib/schemas/task";
import type { z } from "zod";

type TaskStatusValue = z.infer<typeof TaskStatus>;

const metadataClass =
  "hidden text-[12px] text-zinc-400 sm:inline";

type TaskRowProps = {
  task: Task;
  projectName?: string | null;
  onStatusChange: (status: TaskStatusValue) => void;
  onEdit?: () => void;
  busy?: boolean;
};

export function TaskRow({
  task,
  projectName,
  onStatusChange,
  onEdit,
  busy = false,
}: TaskRowProps) {
  const isDone = task.status === "Done";
  const isDropped = task.status === "Dropped";
  const showWeather = false; // v1: weather deferred (step 12)

  const metadata: string[] = [task.status];
  if ((isDone || isDropped) && task.actual_minutes != null) {
    if (task.estimate_minutes != null) {
      metadata.push(
        `estimated ${formatEstimateMinutes(task.estimate_minutes)}, took ${formatEstimateMinutes(task.actual_minutes)}`,
      );
    } else {
      metadata.push(`took ${formatEstimateMinutes(task.actual_minutes)}`);
    }
  } else {
    if (task.due_at) metadata.push(formatDueAt(task.due_at));
    if (task.estimate_minutes != null) {
      metadata.push(formatEstimateMinutes(task.estimate_minutes));
    }
  }

  return (
    <div className="group flex h-10 items-center gap-2 border-b border-zinc-100 px-3 text-sm">
      <StatusDot
        status={task.status}
        onStatusChange={onStatusChange}
        disabled={busy}
      />

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className={`min-w-0 flex-1 truncate text-left ${
            isDone || isDropped ? "text-zinc-400" : "text-zinc-900"
          } ${isDropped ? "line-through" : ""} hover:underline disabled:opacity-50`}
          title={task.title}
        >
          {task.title}
        </button>
      ) : (
        <span
          className={`min-w-0 flex-1 truncate ${
            isDone || isDropped ? "text-zinc-400" : "text-zinc-900"
          } ${isDropped ? "line-through" : ""}`}
          title={task.title}
        >
          {task.title}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-2">
        {showWeather ? <WeatherWarning /> : null}
        {metadata.length > 0 && (
          <span
            className={`${metadataClass} ${isDropped ? "line-through" : ""}`}
          >
            {metadata.join(" · ")}
          </span>
        )}
        {projectName && (
          <span className={metadataClass}>{projectName}</span>
        )}
      </div>
    </div>
  );
}
