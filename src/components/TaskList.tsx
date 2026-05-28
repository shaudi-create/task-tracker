"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CompletionLogModal,
  type CompletionPayload,
  type TerminalStateValue,
} from "@/components/CompletionLogModal";
import { TaskRow } from "@/components/TaskRow";
import type { TasksViewFilter } from "@/components/TaskFilterBar";
import type { Project } from "@/lib/schemas/project";
import { PROJECTS_UPDATED, notifyTasksUpdated } from "@/lib/events";
import { taskMatchesToday } from "@/lib/utils/todayFilter";
import { TaskStatus, type Task } from "@/lib/schemas/task";
import type { z } from "zod";

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

function tasksUrl(filter: TasksViewFilter, projectId: string | null): string {
  const params = new URLSearchParams();
  if (filter === "Today") {
    params.set("filter", "today");
  } else if (filter !== "All") {
    params.set("status", filter);
  }
  if (projectId) params.set("project", projectId);
  const query = params.toString();
  return query ? `/api/tasks?${query}` : "/api/tasks";
}

type CompletionModalState = {
  task: Task;
  terminalState: TerminalStateValue;
};

type TaskListProps = {
  filter: TasksViewFilter;
  projectId?: string | null;
  onEditTask?: (task: Task) => void;
  onTasksLoaded?: (tasks: Task[]) => void;
};

export function TaskList({
  filter,
  projectId = null,
  onEditTask,
  onTasksLoaded,
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [completionModal, setCompletionModal] =
    useState<CompletionModalState | null>(null);
  const [completing, setCompleting] = useState(false);
  const onTasksLoadedRef = useRef(onTasksLoaded);
  onTasksLoadedRef.current = onTasksLoaded;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [taskRows, projectRows] = await Promise.all([
          fetchJson<Task[]>(tasksUrl(filter, projectId)),
          fetchJson<Project[]>("/api/projects"),
        ]);
        if (cancelled) return;
        setTasks(taskRows);
        setProjects(projectRows);
        onTasksLoadedRef.current?.(taskRows);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, projectId]);

  useEffect(() => {
    function onProjectsUpdated() {
      void fetchJson<Project[]>("/api/projects")
        .then(setProjects)
        .catch(() => {});
    }
    window.addEventListener(PROJECTS_UPDATED, onProjectsUpdated);
    return () =>
      window.removeEventListener(PROJECTS_UPDATED, onProjectsUpdated);
  }, []);

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const sortedTasks = useMemo(() => {
    if (filter !== "All") return tasks;
    const active = tasks.filter((t) => t.status !== "Dropped");
    const dropped = tasks.filter((t) => t.status === "Dropped");
    return [...active, ...dropped];
  }, [tasks, filter]);

  async function patchTask(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const updated = await fetchJson<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      applyUpdatedTask(updated);
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

  function applyUpdatedTask(updated: Task) {
    setTasks((prev) => {
      if (projectId && updated.project_id !== projectId) {
        const next = prev.filter((t) => t.id !== updated.id);
        onTasksLoadedRef.current?.(next);
        return next;
      }
      if (filter === "Today" && !taskMatchesToday(updated)) {
        const next = prev.filter((t) => t.id !== updated.id);
        onTasksLoadedRef.current?.(next);
        return next;
      }
      if (filter !== "All" && filter !== "Today" && updated.status !== filter) {
        const next = prev.filter((t) => t.id !== updated.id);
        onTasksLoadedRef.current?.(next);
        return next;
      }
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      onTasksLoadedRef.current?.(next);
      return next;
    });
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
      applyUpdatedTask(updated);
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

  const emptyMessage =
    filter === "Today"
      ? "Nothing on the docket today."
      : "Nothing here yet. Try typing a task above.";

  return (
    <>
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse border-b border-zinc-100 bg-zinc-50"
          />
        ))}

      {!loading && tasks.length === 0 && (
        <p
          className={`py-8 text-center text-xs text-zinc-400 ${
            filter === "Today" ? "" : "text-sm text-zinc-500"
          }`}
        >
          {emptyMessage}
        </p>
      )}

      {!loading &&
        sortedTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            projectName={
              task.project_id ? projectNames.get(task.project_id) : null
            }
            busy={busyId === task.id}
            onStatusChange={(status) => handleStatusChange(task, status)}
            onEdit={onEditTask ? () => onEditTask(task) : undefined}
          />
        ))}

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
    </>
  );
}
