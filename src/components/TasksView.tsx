"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ConfirmTaskModal,
  parseResponseToDraft,
  taskToDraft,
  type TaskDraft,
} from "@/components/ConfirmTaskModal";
import { QuickCapture } from "@/components/QuickCapture";
import {
  TASK_FILTERS,
  TaskFilterBar,
  filterIndexToFilter,
  type TaskFilter,
  type TasksViewFilter,
} from "@/components/TaskFilterBar";
import { TaskList } from "@/components/TaskList";
import { TodayWorkloadHeader } from "@/components/TodayWorkloadHeader";
import { TopBar } from "@/components/TopBar";
import { notifyTasksUpdated } from "@/lib/events";
import type { ParseApiResponse } from "@/lib/schemas/parse";
import type { Project } from "@/lib/schemas/project";
import type { Task } from "@/lib/schemas/task";
import { PROJECTS_UPDATED } from "@/lib/events";
import {
  DESCRIPTION_TRIMMED_MESSAGE,
  descriptionWasTrimmed,
} from "@/lib/utils/taskDraft";

function parseViewFilter(searchParams: URLSearchParams): TasksViewFilter {
  if (searchParams.get("filter") === "today") return "Today";
  const status = searchParams.get("status");
  if (status && TASK_FILTERS.includes(status as TaskFilter) && status !== "All") {
    return status as TaskFilter;
  }
  return "All";
}

export function TasksView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = searchParams.get("project");

  const viewFilter = useMemo(
    () => parseViewFilter(searchParams),
    [searchParams],
  );
  const isToday = viewFilter === "Today";

  const [listKey, setListKey] = useState(0);
  const [todayTaskCount, setTodayTaskCount] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<TaskDraft | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const setViewFilter = useCallback(
    (next: TasksViewFilter) => {
      const params = new URLSearchParams();
      if (projectId) params.set("project", projectId);
      if (next === "Today") {
        params.set("filter", "today");
      } else if (next !== "All") {
        params.set("status", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, projectId, router],
  );

  const handleTasksLoaded = useCallback(
    (tasks: Task[]) => {
      if (isToday) setTodayTaskCount(tasks.length);
    },
    [isToday],
  );

  useEffect(() => {
    if (!isToday) setTodayTaskCount(0);
  }, [isToday]);

  const loadProjects = useCallback(() => {
    void fetch("/api/projects")
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onProjectsUpdated() {
      loadProjects();
    }
    window.addEventListener(PROJECTS_UPDATED, onProjectsUpdated);
    return () =>
      window.removeEventListener(PROJECTS_UPDATED, onProjectsUpdated);
  }, [loadProjects]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const digit = Number(event.key);
      if (!Number.isInteger(digit)) return;
      const next = filterIndexToFilter(digit);
      if (next) setViewFilter(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setViewFilter]);

  const openCreateModal = useCallback(
    (result: {
      data: ParseApiResponse;
      rawInput: string;
      parseUnavailable?: boolean;
    }) => {
      setSaveError(null);
      setEditingTaskId(null);
      setModalDraft(
        parseResponseToDraft(
          result.data,
          result.rawInput,
          result.parseUnavailable,
        ),
      );
      setModalOpen(true);
    },
    [],
  );

  const openEditModal = useCallback((task: Task) => {
    setSaveError(null);
    setEditingTaskId(task.id);
    setModalDraft(taskToDraft(task));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (draft: TaskDraft) => {
      setSaving(true);
      setSaveError(null);
      try {
        const body = {
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
        };

        if (editingTaskId) {
          const res = await fetch(`/api/tasks/${editingTaskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const err = (await res.json()) as { error?: { message?: string } };
            throw new Error(err.error?.message ?? "Failed to update task");
          }
          if (descriptionWasTrimmed(res)) {
            setToast(DESCRIPTION_TRIMMED_MESSAGE);
          }
        } else {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, status: "Backlog" as const }),
          });
          if (!res.ok) {
            const err = (await res.json()) as { error?: { message?: string } };
            throw new Error(err.error?.message ?? "Failed to create task");
          }
          if (descriptionWasTrimmed(res)) {
            setToast(DESCRIPTION_TRIMMED_MESSAGE);
          }
        }

        router.refresh();
        setModalOpen(false);
        setModalDraft(null);
        setEditingTaskId(null);
        setListKey((k) => k + 1);
        notifyTasksUpdated();
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save task",
        );
      } finally {
        setSaving(false);
      }
    },
    [editingTaskId, router],
  );

  return (
    <>
      <TopBar>
        <QuickCapture onParsed={openCreateModal} disabled={modalOpen} />
        <TaskFilterBar active={viewFilter} onChange={setViewFilter} />
      </TopBar>
      <div className="px-6 py-4">
        {isToday && (
          <TodayWorkloadHeader
            refreshKey={listKey}
            taskCount={todayTaskCount}
          />
        )}
        <TaskList
          key={`${listKey}-${projectId ?? ""}-${viewFilter}`}
          filter={viewFilter}
          projectId={projectId}
          onEditTask={openEditModal}
          onTasksLoaded={handleTasksLoaded}
        />
      </div>

      {saveError && !modalOpen && (
        <p className="px-6 text-sm text-red-600" role="alert">
          {saveError}
        </p>
      )}

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
          open={modalOpen}
          initial={modalDraft}
          projects={projects}
          mode={editingTaskId ? "edit" : "create"}
          saving={saving}
          onClose={() => {
            setModalOpen(false);
            setModalDraft(null);
            setEditingTaskId(null);
          }}
          onSave={handleSave}
          onDescriptionTrimmed={() => setToast(DESCRIPTION_TRIMMED_MESSAGE)}
        />
      )}
    </>
  );
}
