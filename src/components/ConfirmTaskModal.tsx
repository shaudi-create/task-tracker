"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterChip } from "@/components/FilterChip";
import { formatEstimateMinutes } from "@/lib/format";
import type { ParseApiResponse } from "@/lib/schemas/parse";
import type { Project } from "@/lib/schemas/project";
import { LocationTag, Priority } from "@/lib/schemas/task";

const LOCATION_OPTIONS = LocationTag.options.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}));

const PRIORITY_OPTIONS = Priority.options.map((value) => ({
  value,
  label: value,
}));

export type TaskDraft = {
  title: string;
  due_at: string | null;
  scheduled_at: string | null;
  location_tag: (typeof LocationTag.options)[number] | null;
  priority: (typeof Priority.options)[number] | null;
  estimate_minutes: number | null;
  estimate_rationale: string | null;
  project_id: string | null;
  tags: string[];
  partial?: boolean;
  parseUnavailable?: boolean;
  estimateUnavailable?: boolean;
};

type ConfirmTaskModalProps = {
  open: boolean;
  initial: TaskDraft;
  projects: Project[];
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void | Promise<void>;
};

function draftFromParse(
  data: ParseApiResponse,
  rawInput: string,
  opts?: { partial?: boolean; parseUnavailable?: boolean },
): TaskDraft {
  return {
    title: data.title || rawInput,
    due_at: data.due_at ?? null,
    scheduled_at: data.scheduled_at ?? null,
    location_tag: data.location_tag ?? null,
    priority: data.priority ?? null,
    estimate_minutes: data.estimate_minutes ?? null,
    estimate_rationale: null,
    project_id: data.project_id ?? null,
    tags: data.tags ?? [],
    partial: opts?.partial ?? data.partial,
    parseUnavailable: opts?.parseUnavailable,
  };
}

export function parseResponseToDraft(
  data: ParseApiResponse | { title: string; partial?: boolean },
  rawInput: string,
  parseUnavailable = false,
): TaskDraft {
  return draftFromParse(data as ParseApiResponse, rawInput, {
    partial: data.partial ?? parseUnavailable,
    parseUnavailable,
  });
}

export function ConfirmTaskModal({
  open,
  initial,
  projects,
  saving = false,
  onClose,
  onSave,
}: ConfirmTaskModalProps) {
  const [draft, setDraft] = useState<TaskDraft>(initial);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (!open) return;

    setDraft(initial);
    setEstimating(false);

    const needsEstimate =
      initial.estimate_minutes == null && initial.title.trim().length > 0;

    if (!needsEstimate) return;

    let cancelled = false;

    async function runEstimate() {
      setEstimating(true);
      try {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: initial.title.trim(),
            location_tag: initial.location_tag ?? "home",
          }),
        });
        const data = (await res.json()) as {
          estimate_minutes?: number;
          rationale?: string;
          error?: { message?: string };
        };

        if (cancelled) return;

        if (res.ok && data.estimate_minutes != null) {
          setDraft((d) => ({
            ...d,
            estimate_minutes: data.estimate_minutes ?? null,
            estimate_rationale: data.rationale ?? null,
            estimateUnavailable: false,
          }));
        } else if (res.status === 503) {
          setDraft((d) => ({ ...d, estimateUnavailable: true }));
        }
      } catch {
        if (!cancelled) {
          setDraft((d) => ({ ...d, estimateUnavailable: true }));
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }

    void runEstimate();

    return () => {
      cancelled = true;
    };
  }, [open, initial]);

  const handleSave = useCallback(() => {
    if (!draft.title.trim() || saving) return;
    void onSave({ ...draft, title: draft.title.trim() });
  }, [draft, onSave, saving]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSave();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, handleSave]);

  if (!open) return null;

  const projectOptions = [
    { value: "", label: "No project" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-task-title"
    >
      <div className="w-full max-w-[480px] rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <FilterChip
            label="Title"
            placeholder="Task title"
            size="md"
            editable
            kind="text"
            value={draft.title}
            onChange={(v) =>
              setDraft((d) => ({ ...d, title: v ?? "" }))
            }
            emptyTone="muted"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {(draft.partial || draft.parseUnavailable) && (
          <p
            className={`mt-3 text-xs ${
              draft.parseUnavailable
                ? "text-zinc-500"
                : "rounded border border-amber-400 bg-amber-50 px-2 py-1.5 text-amber-900"
            }`}
          >
            {draft.parseUnavailable
              ? "Couldn't reach the parser — fill in below."
              : "Couldn't extract details — fill in below."}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            label="Due"
            placeholder="Set due…"
            editable
            kind="date"
            value={draft.due_at}
            onChange={(v) => setDraft((d) => ({ ...d, due_at: v }))}
          />
          <FilterChip
            label="Scheduled"
            placeholder="Set time…"
            editable
            kind="datetime"
            value={draft.scheduled_at}
            onChange={(v) => setDraft((d) => ({ ...d, scheduled_at: v }))}
          />
          <FilterChip
            label="Location"
            placeholder="Location…"
            editable
            kind="select"
            options={LOCATION_OPTIONS}
            value={draft.location_tag}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                location_tag: (v || null) as TaskDraft["location_tag"],
              }))
            }
          />
          <FilterChip
            label="Priority"
            placeholder="Priority…"
            editable
            kind="select"
            options={PRIORITY_OPTIONS}
            value={draft.priority}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                priority: (v || null) as TaskDraft["priority"],
              }))
            }
          />
          <span
            title={draft.estimate_rationale ?? undefined}
            className="inline-flex"
          >
            <FilterChip
              label="Estimate"
              placeholder={estimating ? "Estimating…" : "Estimate…"}
              editable={!estimating}
              kind="text"
              value={
                draft.estimate_minutes != null
                  ? formatEstimateMinutes(draft.estimate_minutes)
                  : null
              }
              onChange={(v) => {
                const n = v ? Number.parseInt(v.replace(/\D/g, ""), 10) : null;
                setDraft((d) => ({
                  ...d,
                  estimate_minutes:
                    n != null && !Number.isNaN(n)
                      ? Math.max(0, Math.round(n / 5) * 5)
                      : null,
                  estimate_rationale: null,
                }));
              }}
            />
          </span>
          <FilterChip
            label="Project"
            placeholder="Project…"
            editable
            kind="select"
            options={projectOptions}
            value={draft.project_id ?? ""}
            onChange={(v) =>
              setDraft((d) => ({ ...d, project_id: v || null }))
            }
          />
        </div>

        {draft.estimateUnavailable && (
          <p className="mt-2 text-xs text-zinc-500">
            Estimation unavailable — fill manually.
          </p>
        )}

        {draft.estimate_rationale && (
          <p className="mt-2 truncate text-xs text-zinc-500">
            {draft.estimate_rationale}
          </p>
        )}

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
            disabled={saving || !draft.title.trim()}
            onClick={() => void handleSave()}
            className="rounded bg-[#5E6AD2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4e5ac2] disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add task"}
          </button>
        </div>
        <p className="mt-2 text-right text-[11px] text-zinc-400">⌘↵ to save</p>
      </div>
    </div>
  );
}
