"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEstimateMinutes } from "@/lib/format";
import type { Task } from "@/lib/schemas/task";

export type CompletionPayload = {
  actual_minutes: number;
  what_worked?: string;
  what_blocked?: string;
};

type CompletionLogModalProps = {
  open: boolean;
  task: Task | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: CompletionPayload) => void | Promise<void>;
};

export function CompletionLogModal({
  open,
  task,
  saving = false,
  onClose,
  onSubmit,
}: CompletionLogModalProps) {
  const [actualMinutes, setActualMinutes] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatBlocked, setWhatBlocked] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !task) return;
    setActualMinutes(
      task.estimate_minutes != null ? String(task.estimate_minutes) : "",
    );
    setWhatWorked("");
    setWhatBlocked("");
    setError(null);
  }, [open, task]);

  const handleSubmit = useCallback(() => {
    const raw = actualMinutes.trim();
    if (!raw) {
      setError("Enter how long it took");
      return;
    }
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0) {
      setError("Enter how long it took");
      return;
    }
    if (n % 5 !== 0) {
      setError("Use 5-minute increments");
      return;
    }

    setError(null);
    void onSubmit({
      actual_minutes: n,
      what_worked: whatWorked.trim() || undefined,
      what_blocked: whatBlocked.trim() || undefined,
    });
  }, [actualMinutes, whatWorked, whatBlocked, onSubmit]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSubmit();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, handleSubmit]);

  if (!open || !task) return null;

  const estimateHint =
    task.estimate_minutes != null
      ? `Estimated ${formatEstimateMinutes(task.estimate_minutes)}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-log-title"
    >
      <div className="w-full max-w-[480px] rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="completion-log-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Log & mark done
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-500">{task.title}</p>
            {estimateHint && (
              <p className="mt-1 text-xs text-zinc-400">{estimateHint}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600">
              How long did it take? (minutes)
            </span>
            <input
              type="number"
              min={0}
              step={5}
              value={actualMinutes}
              onChange={(e) => {
                setActualMinutes(e.target.value);
                setError(null);
              }}
              className="w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              autoFocus
            />
          </label>
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600">
              What worked? (optional)
            </span>
            <textarea
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600">
              What blocked you? (optional)
            </span>
            <textarea
              value={whatBlocked}
              onChange={(e) => setWhatBlocked(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit()}
            className="rounded bg-[#5E6AD2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4e5ac2] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Log & Mark Done"}
          </button>
        </div>
        <p className="mt-2 text-right text-[11px] text-zinc-400">⌘↵ to save</p>
      </div>
    </div>
  );
}
