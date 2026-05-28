"use client";

import { useState } from "react";
import { StatusDot } from "@/components/StatusDot";
import type { Task } from "@/lib/schemas/task";
import { bucketForMinutes } from "@/lib/schemas/ghBucket";
import { TaskStatus } from "@/lib/schemas/task";
import type { z } from "zod";

type TaskStatusValue = z.infer<typeof TaskStatus>;

const BUCKET_BADGE: Record<
  ReturnType<typeof bucketForMinutes>,
  { className: string }
> = {
  XS: { className: "bg-zinc-100 text-zinc-700" },
  S: { className: "bg-blue-100 text-blue-700" },
  M: { className: "bg-violet-100 text-violet-700" },
  L: { className: "bg-amber-100 text-amber-700" },
  XL: { className: "bg-rose-100 text-rose-700" },
};

type GitHubInboxRowProps = {
  task: Task;
  onRemove?: (taskId: string) => void;
};

export function GitHubInboxRow({ task, onRemove }: GitHubInboxRowProps) {
  const [busy, setBusy] = useState(false);
  const bucket = bucketForMinutes(task.estimate_minutes);
  const badge = BUCKET_BADGE[bucket];

  async function patchStatus(status: TaskStatusValue) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error("Failed to update task");
      }
      if (status !== "Inbox") {
        onRemove?.(task.id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group flex items-start gap-3 border-b border-zinc-100 px-3 py-2 text-sm">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${badge.className}`}
        title={`Bucket ${bucket}`}
      >
        {bucket}
      </span>

      <div className="min-w-0 flex-1">
        <a
          href={task.github_issue_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-medium text-zinc-900 hover:underline"
          title={task.title}
        >
          {task.title}
        </a>
        {task.estimate_rationale && (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
            {task.estimate_rationale}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <StatusDot
          status={task.status}
          onStatusChange={(s) => void patchStatus(s)}
          disabled={busy}
        />
      </div>
    </div>
  );
}
