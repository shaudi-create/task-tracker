"use client";

import { useState } from "react";
import type { Task } from "@/lib/schemas/task";
import { bucketForMinutes } from "@/lib/schemas/ghBucket";

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
  const [busy, setBusy] = useState<"accept" | "dismiss" | null>(null);
  const bucket = bucketForMinutes(task.estimate_minutes);
  const badge = BUCKET_BADGE[bucket];

  async function patchStatus(status: "Backlog" | "Dropped") {
    setBusy(status === "Backlog" ? "accept" : "dismiss");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error("Failed to update task");
      }
      onRemove?.(task.id);
    } finally {
      setBusy(null);
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

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => void patchStatus("Backlog")}
          disabled={busy !== null}
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
          aria-label="Accept into backlog"
          title="Accept"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => void patchStatus("Dropped")}
          disabled={busy !== null}
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
          aria-label="Dismiss"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
