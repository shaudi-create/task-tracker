"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CompletionLogModal,
  type CompletionPayload,
  type TerminalStateValue,
} from "@/components/CompletionLogModal";
import {
  ConfirmTaskModal,
  taskToDraft,
  type TaskDraft,
} from "@/components/ConfirmTaskModal";
import { TaskRow } from "@/components/TaskRow";
import { WeekDayHeader } from "@/components/WeekDayHeader";
import {
  PROJECTS_UPDATED,
  TASKS_UPDATED,
  notifyTasksUpdated,
} from "@/lib/events";
import type { DayCeilings, Settings } from "@/lib/schemas/settings";
import type { Project } from "@/lib/schemas/project";
import type { Task } from "@/lib/schemas/task";
import { ceilingForDate } from "@/lib/utils/dayCeilings";
import {
  DESCRIPTION_TRIMMED_MESSAGE,
  descriptionWasTrimmed,
} from "@/lib/utils/taskDraft";
import { sumWorkloadMinutesForDay } from "@/lib/utils/workload";
import { groupTasksByWeekDay } from "@/lib/utils/weekAgenda";
import {
  addDaysToDateString,
  localDateFromIso,
  localDateString,
} from "@/lib/utils/tz";
import type { z } from "zod";
import { TaskStatus } from "@/lib/schemas/task";

type TaskStatusValue = z.infer<typeof TaskStatus>;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data: unknown = await res.json();
  if (!res.ok) {
    const err = data as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export function WeekAgenda() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dayCeilings, setDayCeilings] = useState<DayCeilings | null>(null);
  const [fallbackCeiling, setFallbackCeiling] = useState(360);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [completionModal, setCompletionModal] = useState<{
    task: Task;
    terminalState: TerminalStateValue;
  } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [modalDraft, setModalDraft] = useState<TaskDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const start = localDateString();
    return Array.from({ length: 7 }, (_, i) => addDaysToDateString(start, i));
  }, []);

  const today = localDateString();

  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set([today]),
  );

  const toggleDay = useCallback((day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRows, projectRows, settings] = await Promise.all([
        fetchJson<Task[]>("/api/tasks?filter=agenda"),
        fetchJson<Project[]>("/api/projects"),
        fetchJson<Settings>("/api/settings"),
      ]);
      setTasks(taskRows);
      setProjects(projectRows);
      setDayCeilings(settings.day_ceilings);
      setFallbackCeiling(settings.daily_ceiling_minutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onRefresh() {
      void load();
    }
    window.addEventListener(PROJECTS_UPDATED, onRefresh);
    window.addEventListener(TASKS_UPDATED, onRefresh);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED, onRefresh);
      window.removeEventListener(TASKS_UPDATED, onRefresh);
    };
  }, [load]);

  const projectNames = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const tasksByDay = useMemo(
    () => groupTasksByWeekDay(tasks, weekDays),
    [tasks, weekDays],
  );

  async function patchTask(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const updated = await fetchJson<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      notifyTasksUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setBusyId(null);
    }
  }

  function handleStatusChange(task: Task, status: TaskStatusValue) {
    if (status === task.status) return;
    if (status === "Done" || status === "Dropped") {
      setCompletionModal({ task, terminalState: status });
      return;
    }
    void patchTask(task.id, { status });
  }

  async function submitCompletion(payload: CompletionPayload) {
    if (!completionModal) return;
    setCompleting(true);
    try {
      const updated = await fetchJson<Task>(
        `/api/tasks/${completionModal.task.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setCompletionModal(null);
      notifyTasksUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setCompleting(false);
    }
  }

  async function skipDropLogging() {
    if (!completionModal) return;
    setCompleting(true);
    try {
      await patchTask(completionModal.task.id, { status: "Dropped" });
      setCompletionModal(null);
    } finally {
      setCompleting(false);
    }
  }

  async function handleSaveEdit(draft: TaskDraft) {
    if (!editTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          subtasks: draft.subtasks,
          priority: draft.priority ?? "Medium",
          location_tag: draft.location_tag ?? "home",
          estimate_minutes: draft.estimate_minutes,
          estimate_rationale: draft.estimate_rationale,
          due_at: draft.due_at,
          scheduled_at: draft.scheduled_at,
          project_id: draft.project_id,
          tags: draft.tags,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to save task");
      }
      const updated = data as Task;
      if (descriptionWasTrimmed(res)) {
        setToast(DESCRIPTION_TRIMMED_MESSAGE);
      }
      setTasks((prev) => {
        const stillInWeek =
          updated.status === "In Progress" ||
          (updated.scheduled_at &&
            weekDays.includes(localDateFromIso(updated.scheduled_at)));
        if (!stillInWeek) return prev.filter((t) => t.id !== updated.id);
        return prev.map((t) => (t.id === updated.id ? updated : t));
      });
      setEditTask(null);
      setModalDraft(null);
      notifyTasksUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="mb-6 h-24 animate-pulse rounded bg-zinc-50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {weekDays.map((day) => {
        const dayTasks = tasksByDay.get(day) ?? [];
        const expanded = expandedDays.has(day);
        const totalMinutes = sumWorkloadMinutesForDay(tasks, day);
        const ceiling =
          dayCeilings != null
            ? ceilingForDate(day, dayCeilings, fallbackCeiling)
            : fallbackCeiling;

        return (
          <section key={day} className="mb-8 last:mb-0">
            <WeekDayHeader
              date={day}
              totalMinutes={totalMinutes}
              taskCount={dayTasks.length}
              ceilingMinutes={ceiling}
              expanded={expanded}
              onToggle={() => toggleDay(day)}
            />
            {expanded &&
              (dayTasks.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-400">
                  No tasks scheduled.
                </p>
              ) : (
                dayTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectName={
                      task.project_id
                        ? projectNames.get(task.project_id)
                        : null
                    }
                    busy={busyId === task.id}
                    onStatusChange={(status) =>
                      handleStatusChange(task, status)
                    }
                    onEdit={() => {
                      setEditTask(task);
                      setModalDraft(taskToDraft(task));
                    }}
                  />
                ))
              ))}
          </section>
        );
      })}

      <CompletionLogModal
        open={completionModal !== null}
        task={completionModal?.task ?? null}
        terminalState={completionModal?.terminalState ?? "Done"}
        saving={completing}
        onClose={() => setCompletionModal(null)}
        onSubmit={submitCompletion}
        onSkip={
          completionModal?.terminalState === "Dropped"
            ? skipDropLogging
            : undefined
        }
      />

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[60] rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}

      {modalDraft && (
        <ConfirmTaskModal
          open={editTask !== null}
          initial={modalDraft}
          projects={projects}
          mode="edit"
          saving={saving}
          onClose={() => {
            setEditTask(null);
            setModalDraft(null);
          }}
          onSave={handleSaveEdit}
          onDescriptionTrimmed={() => setToast(DESCRIPTION_TRIMMED_MESSAGE)}
        />
      )}
    </div>
  );
}
