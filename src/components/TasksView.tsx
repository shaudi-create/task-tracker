"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ConfirmTaskModal,
  parseResponseToDraft,
  taskToDraft,
  type TaskDraft,
} from "@/components/ConfirmTaskModal";
import { QuickCapture } from "@/components/QuickCapture";
import {
  filterIndexToFilter,
  TaskFilterBar,
  type TaskFilter,
} from "@/components/TaskFilterBar";
import { TaskList } from "@/components/TaskList";
import { TopBar } from "@/components/TopBar";
import type { ParseApiResponse } from "@/lib/schemas/parse";
import type { Project } from "@/lib/schemas/project";
import type { Task } from "@/lib/schemas/task";
import { PROJECTS_UPDATED } from "@/lib/events";

export function TasksView() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [listKey, setListKey] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<TaskDraft | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      if (next) setFilter(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        }

        setModalOpen(false);
        setModalDraft(null);
        setEditingTaskId(null);
        setListKey((k) => k + 1);
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save task",
        );
      } finally {
        setSaving(false);
      }
    },
    [editingTaskId],
  );

  return (
    <>
      <TopBar>
        <QuickCapture onParsed={openCreateModal} disabled={modalOpen} />
        <TaskFilterBar active={filter} onChange={setFilter} />
      </TopBar>
      <div className="px-6 py-4">
        <TaskList
          key={`${listKey}-${projectId ?? ""}`}
          filter={filter}
          projectId={projectId}
          onEditTask={openEditModal}
        />
      </div>

      {saveError && !modalOpen && (
        <p className="px-6 text-sm text-red-600" role="alert">
          {saveError}
        </p>
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
        />
      )}
    </>
  );
}
