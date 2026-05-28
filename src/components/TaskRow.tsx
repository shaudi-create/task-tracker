"use client";

import { StatusDot } from "@/components/StatusDot";
import { WeatherWarning } from "@/components/WeatherWarning";
import { formatDueAt, formatEstimateMinutes } from "@/lib/format";
import { STATUS_TEXT } from "@/lib/statusColors";
import { projectDotColorClass } from "@/lib/utils/projectColor";
import { TaskStatus, type Task } from "@/lib/schemas/task";
import type { z } from "zod";

type TaskStatusValue = z.infer<typeof TaskStatus>;

const metadataClass =
  "hidden text-[12px] sm:inline";

const grayMeta = "text-zinc-400";

type TaskRowProps = {
  task: Task;
  projectName?: string | null;
  onStatusChange: (status: TaskStatusValue) => void;
  onEdit?: () => void;
  busy?: boolean;
};

function PriorityMarker({ priority }: { priority: Task["priority"] }) {
  if (priority === "Urgent") {
    return (
      <span className="w-3 shrink-0 text-center text-xs leading-none text-red-500">
        ↑↑
      </span>
    );
  }
  if (priority === "High") {
    return (
      <span className="w-3 shrink-0 text-center text-xs leading-none text-amber-500">
        ↑
      </span>
    );
  }
  return null;
}

function buildRestMetadata(
  task: Task,
): string[] {
  const isDone = task.status === "Done";
  const isDropped = task.status === "Dropped";

  if ((isDone || isDropped) && task.actual_minutes != null) {
    if (task.estimate_minutes != null) {
      return [
        `${formatEstimateMinutes(task.estimate_minutes)} → ${formatEstimateMinutes(task.actual_minutes)}`,
      ];
    }
    return [`→ ${formatEstimateMinutes(task.actual_minutes)}`];
  }

  const parts: string[] = [];
  if (task.due_at) parts.push(formatDueAt(task.due_at));
  if (task.estimate_minutes != null) {
    parts.push(formatEstimateMinutes(task.estimate_minutes));
  }
  return parts;
}

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
  const restMeta = buildRestMetadata(task);
  const subtaskTotal = task.subtasks?.length ?? 0;
  const subtaskDone =
    task.subtasks?.filter((s) => s.done).length ?? 0;
  const hasDescription = Boolean(task.description?.trim());

  return (
    <div className="group flex h-10 items-center gap-2 border-b border-zinc-100 px-3 text-sm">
      <PriorityMarker priority={task.priority} />
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
        <span
          className={`${metadataClass} ${isDropped ? "line-through" : ""}`}
        >
            <span className={`${STATUS_TEXT[task.status]} opacity-70`}>
              {task.status}
            </span>
            {restMeta.map((part) => (
              <span key={part} className={grayMeta}>
                {" · "}
                {part}
              </span>
            ))}
            {projectName && (
              <span className={`${grayMeta} inline-flex items-center gap-1`}>
                {" · "}
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${projectDotColorClass(projectName)}`}
                  aria-hidden
                />
                {projectName}
              </span>
            )}
            {subtaskTotal > 0 && (
              <span className={grayMeta}>
                {" · "}
                {subtaskDone}/{subtaskTotal}
              </span>
            )}
            {hasDescription && (
              <span className={grayMeta} title="Has description">
                {" · "}
                <span aria-hidden>📄</span>
              </span>
            )}
        </span>
      </div>
    </div>
  );
}
