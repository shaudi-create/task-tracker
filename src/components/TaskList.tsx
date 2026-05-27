"use client";

import { useCallback, useEffect, useState } from "react";
import { TaskRow } from "@/components/TaskRow";
import type { TaskFilter } from "@/components/TaskFilterBar";
import type { Project } from "@/lib/schemas/project";
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

function tasksUrl(filter: TaskFilter): string {
  if (filter === "All") return "/api/tasks";
  return `/api/tasks?status=${encodeURIComponent(filter)}`;
}

type TaskListProps = {
  filter: TaskFilter;
};

export function TaskList({ filter }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (activeFilter: TaskFilter) => {
    setLoading(true);
    setError(null);
    try {
      const [taskRows, projectRows] = await Promise.all([
        fetchJson<Task[]>(tasksUrl(activeFilter)),
        fetchJson<Project[]>("/api/projects"),
      ]);
      setTasks(taskRows);
      setProjects(projectRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  async function patchTask(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const updated = await fetchJson<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setBusyId(null);
    }
  }

  async function dropTask(id: string) {
    setBusyId(id);
    try {
      const updated = await fetchJson<Task>(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to drop task");
    } finally {
      setBusyId(null);
    }
  }

  function handleStatusChange(task: Task, status: TaskStatusValue) {
    if (status === task.status) return;
    void patchTask(task.id, { status });
  }

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
        <p className="py-8 text-center text-sm text-zinc-500">
          Nothing here yet. Try typing a task above.
        </p>
      )}

      {!loading &&
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            projectName={
              task.project_id ? projectNames.get(task.project_id) : null
            }
            busy={busyId === task.id}
            onStatusChange={(status) => handleStatusChange(task, status)}
            onDone={() => void patchTask(task.id, { status: "Done" })}
            onPause={() => void patchTask(task.id, { status: "Paused" })}
            onDelete={() => void dropTask(task.id)}
          />
        ))}
    </>
  );
}
