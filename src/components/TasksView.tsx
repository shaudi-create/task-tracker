"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ConfirmTaskModal,
  parseResponseToDraft,
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

export function TasksView() {
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [listKey, setListKey] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<TaskDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/projects")
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

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

  const openModal = useCallback(
    (result: {
      data: ParseApiResponse;
      rawInput: string;
      parseUnavailable?: boolean;
    }) => {
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

  const handleSave = useCallback(async (draft: TaskDraft) => {
    setSaving(true);
    try {
      const body = {
        title: draft.title,
        status: "Backlog" as const,
        priority: draft.priority ?? "Medium",
        location_tag: draft.location_tag ?? "home",
        estimate_minutes: draft.estimate_minutes,
        due_at: draft.due_at,
        scheduled_at: draft.scheduled_at,
        project_id: draft.project_id,
        tags: draft.tags,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to create task");
      }

      setModalOpen(false);
      setModalDraft(null);
      setListKey((k) => k + 1);
      if (filter === "Backlog" || filter === "All") {
        setFilter(filter);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [filter]);

  return (
    <>
      <TopBar>
        <QuickCapture onParsed={openModal} disabled={modalOpen} />
        <TaskFilterBar active={filter} onChange={setFilter} />
      </TopBar>
      <div className="px-6 py-4">
        <TaskList key={listKey} filter={filter} />
      </div>

      {modalDraft && (
        <ConfirmTaskModal
          open={modalOpen}
          initial={modalDraft}
          projects={projects}
          saving={saving}
          onClose={() => {
            setModalOpen(false);
            setModalDraft(null);
          }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
