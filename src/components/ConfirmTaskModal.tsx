"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilterChip } from "@/components/FilterChip";
import { SubtaskList } from "@/components/SubtaskList";
import {
  formatDueChipLabel,
  formatSchedChipLabel,
} from "@/lib/format";
import type { ParseApiResponse } from "@/lib/schemas/parse";
import type { Project } from "@/lib/schemas/project";
import {
  LocationTag,
  Priority,
  type SubtaskInput,
  type Task,
} from "@/lib/schemas/task";
import { prepareTaskDraftForSave } from "@/lib/utils/taskDraft";

const LOCATION_OPTIONS = LocationTag.options.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}));

const PRIORITY_OPTIONS = Priority.options.map((value) => ({
  value,
  label: value,
}));

const MAX_DESCRIPTION = 2000;

export type TaskDraft = {
  title: string;
  description: string | null;
  subtasks: SubtaskInput[];
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
  mode?: "create" | "edit";
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void | Promise<void>;
  onDescriptionTrimmed?: () => void;
};

export function taskToDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    subtasks: task.subtasks ?? [],
    due_at: task.due_at,
    scheduled_at: task.scheduled_at,
    location_tag: task.location_tag,
    priority: task.priority,
    estimate_minutes: task.estimate_minutes,
    estimate_rationale: task.estimate_rationale,
    project_id: task.project_id,
    tags: task.tags ?? [],
  };
}

function draftFromParse(
  data: ParseApiResponse,
  rawInput: string,
  opts?: { partial?: boolean; parseUnavailable?: boolean },
): TaskDraft {
  return {
    title: data.title || rawInput,
    description: null,
    subtasks: [],
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
  mode = "create",
  saving = false,
  onClose,
  onSave,
  onDescriptionTrimmed,
}: ConfirmTaskModalProps) {
  const [draft, setDraft] = useState<TaskDraft>(initial);
  const [estimating, setEstimating] = useState(false);
  const [subtaskSectionOpen, setSubtaskSectionOpen] = useState(
    initial.subtasks.length > 0,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setDraft(initial);
    setEstimating(false);
    setSubtaskSectionOpen(initial.subtasks.length > 0);

    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;

    const needsEstimate =
      initial.estimate_minutes == null && initial.title.trim().length > 0;

    if (!needsEstimate) return undefined;

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
    const { prepared, descriptionTrimmed } = prepareTaskDraftForSave(draft);
    if (descriptionTrimmed) onDescriptionTrimmed?.();
    void onSave(prepared);
  }, [draft, onDescriptionTrimmed, onSave, saving]);

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
    { value: "", label: "(none)" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const descriptionLength = draft.description?.length ?? 0;
  const showCharCount = descriptionLength > 1500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-task-title"
    >
      <div className="flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-lg bg-white shadow-lg">
        <div className="shrink-0 border-b border-zinc-100 px-4 pb-3 pt-4">
          {mode === "edit" && (
            <p
              id="confirm-task-title"
              className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Edit task
            </p>
          )}
          <div className="flex items-start justify-between gap-2">
            <input
              ref={titleInputRef}
              type="text"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="Task title"
              className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-base font-medium text-zinc-900 outline-none ring-[#5E6AD2] focus:ring-1"
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

          {mode === "create" && (draft.partial || draft.parseUnavailable) && (
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="Due"
              placeholder="Set due…"
              editable
              kind="date"
              value={draft.due_at}
              formatValue={formatDueChipLabel}
              focusOnEdit={false}
              onChange={(v) => setDraft((d) => ({ ...d, due_at: v }))}
            />
            <FilterChip
              label="Scheduled"
              placeholder="Schedule for…"
              editable
              kind="datetime"
              value={draft.scheduled_at}
              formatValue={formatSchedChipLabel}
              focusOnEdit={false}
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
                placeholder={estimating ? "Estimating…" : "Est. minutes…"}
                editPlaceholder="Enter minutes (e.g., 90)"
                editable={!estimating}
                kind="text"
                value={
                  draft.estimate_minutes != null
                    ? `Est. ${draft.estimate_minutes}m`
                    : null
                }
                onChange={(v) => {
                  setDraft((d) => {
                    if (!v) {
                      return { ...d, estimate_minutes: null, estimate_rationale: null };
                    }

                    const parsed = Number.parseInt(v.replace(/[^\d]/g, ""), 10);
                    if (!Number.isFinite(parsed)) {
                      // Keep prior value if parsing fails or non-numeric.
                      return d;
                    }

                    return {
                      ...d,
                      estimate_minutes: Math.max(0, parsed),
                      estimate_rationale: null,
                    };
                  });
                }}
              />
            </span>
            <FilterChip
              label="Project"
              placeholder="Project…"
              editable
              kind="select"
              options={projectOptions}
              value={draft.project_id}
              active={draft.project_id != null}
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

          <div className="relative mt-4">
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => {
                const value = e.target.value.slice(0, MAX_DESCRIPTION);
                setDraft((d) => ({
                  ...d,
                  description: value.length > 0 ? value : null,
                }));
              }}
              placeholder="Add a description… (optional)"
              rows={3}
              maxLength={MAX_DESCRIPTION}
              className="w-full resize-y rounded-md border-0 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border focus:border-zinc-200"
            />
            {showCharCount && (
              <p className="mt-0.5 text-right text-[11px] text-zinc-400">
                {descriptionLength} / {MAX_DESCRIPTION}
              </p>
            )}
          </div>

          <div className="mt-4">
            <SubtaskList
              subtasks={draft.subtasks}
              sectionOpen={subtaskSectionOpen}
              onSectionOpen={() => setSubtaskSectionOpen(true)}
              onChange={(subtasks) =>
                setDraft((d) => ({ ...d, subtasks }))
              }
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-4 pb-4 pt-3">
          <div className="flex items-center justify-between gap-3">
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
              {saving ? "Saving…" : mode === "edit" ? "Save" : "Add task"}
            </button>
          </div>
          <p className="mt-2 text-right text-[11px] text-zinc-400">⌘↵ to save</p>
        </div>
      </div>
    </div>
  );
}
