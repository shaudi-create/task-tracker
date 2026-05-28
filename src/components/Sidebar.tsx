"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { FilterChip } from "@/components/FilterChip";
import { notifyProjectsUpdated } from "@/lib/events";
import type { Project } from "@/lib/schemas/project";

const navItems = [
  { href: "/tasks", label: "Tasks", showInboxBadge: true },
  { href: "/week", label: "Week" },
  { href: "/settings", label: "Settings" },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/tasks") return pathname === "/tasks";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        fill="currentColor"
        d="M11.5 1.5a1.4 1.4 0 0 1 2 2L5.7 11.3 3 12l.7-2.7L11.5 1.5zM2 13h12v1H2v-1z"
      />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("project");
  const [inboxCount, setInboxCount] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(
    null,
  );
  const [renamingProjectName, setRenamingProjectName] = useState("");
  const [renamingProject, setRenamingProject] = useState(false);
  const newProjectInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          fetch("/api/tasks?status=Inbox"),
          fetch("/api/projects"),
        ]);
        if (tasksRes.ok) {
          const tasks = (await tasksRes.json()) as unknown[];
          setInboxCount(tasks.length);
        }
        if (projectsRes.ok) {
          setProjects((await projectsRes.json()) as Project[]);
        }
      } catch {
        /* keep sidebar usable if fetch fails */
      }
    }
    void load();
  }, [pathname, activeProjectId]);

  useEffect(() => {
    if (creatingProject) {
      newProjectInputRef.current?.focus();
    }
  }, [creatingProject]);

  useEffect(() => {
    if (renamingProjectId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingProjectId]);

  async function submitNewProject() {
    const name = newProjectName.trim();
    if (!name || savingProject) return;

    setSavingProject(true);
    setProjectError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to create project");
      }
      setProjects((prev) => [...prev, data as Project]);
      setNewProjectName("");
      setCreatingProject(false);
      notifyProjectsUpdated();
    } catch (err) {
      setProjectError(
        err instanceof Error ? err.message : "Failed to create project",
      );
    } finally {
      setSavingProject(false);
    }
  }

  function cancelNewProject() {
    setCreatingProject(false);
    setNewProjectName("");
    setProjectError(null);
  }

  function startRename(project: Project, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setRenamingProjectId(project.id);
    setRenamingProjectName(project.name);
    setProjectError(null);
  }

  function cancelRename() {
    setRenamingProjectId(null);
    setRenamingProjectName("");
  }

  async function submitRename() {
    const name = renamingProjectName.trim();
    if (!renamingProjectId || !name || renamingProject) return;

    setRenamingProject(true);
    setProjectError(null);
    try {
      const res = await fetch(`/api/projects/${renamingProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to rename project");
      }
      const updated = data as Project;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === updated.id
            ? { ...p, ...updated, active_task_count: p.active_task_count }
            : p,
        ),
      );
      cancelRename();
      notifyProjectsUpdated();
    } catch (err) {
      setProjectError(
        err instanceof Error ? err.message : "Failed to rename project",
      );
    } finally {
      setRenamingProject(false);
    }
  }

  const tasksNavActive =
    pathname === "/tasks" && activeProjectId == null;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="px-4 py-3 text-xs font-medium text-zinc-600">
        Task Tracker
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const active =
            item.href === "/tasks"
              ? tasksNavActive
              : isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                active
                  ? "bg-white text-zinc-900"
                  : "text-zinc-700 hover:bg-white"
              }`}
            >
              <span>{item.label}</span>
              {"showInboxBadge" in item &&
                item.showInboxBadge &&
                inboxCount > 0 && (
                  <span className="ml-2 min-w-[1.25rem] rounded-full bg-zinc-200 px-1.5 py-0.5 text-center text-[11px] font-medium text-zinc-700">
                    {inboxCount}
                  </span>
                )}
            </Link>
          );
        })}
        <span
          className="cursor-not-allowed rounded px-2 py-1.5 text-sm text-zinc-400"
          title="Deferred to v2"
        >
          GitHub Inbox
        </span>
      </nav>

      <div className="mt-4 flex flex-col gap-1 px-2">
        <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Projects
        </div>
        {projects.map((project) => {
          const active = activeProjectId === project.id;
          const isRenaming = renamingProjectId === project.id;

          if (isRenaming) {
            return (
              <div
                key={project.id}
                className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm ${
                  active ? "bg-white text-zinc-900" : "text-zinc-700"
                }`}
              >
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renamingProjectName}
                  disabled={renamingProject}
                  onChange={(e) => setRenamingProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitRename();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-sm text-zinc-900 outline-none ring-1 ring-[#5E6AD2]"
                />
                <span className="shrink-0 text-xs text-zinc-400">
                  {project.active_task_count ?? 0}
                </span>
              </div>
            );
          }

          return (
            <div
              key={project.id}
              className={`group flex items-center gap-0.5 rounded px-2 py-1.5 text-sm ${
                active
                  ? "bg-white text-zinc-900"
                  : "text-zinc-700 hover:bg-white"
              }`}
            >
              <Link
                href={`/tasks?project=${project.id}`}
                className="min-w-0 flex-1 truncate"
                title={project.name}
              >
                {project.name}
              </Link>
              <span className="shrink-0 text-xs text-zinc-400">
                {project.active_task_count ?? 0}
              </span>
              <button
                type="button"
                onClick={(e) => startRename(project, e)}
                className="shrink-0 rounded p-0.5 text-zinc-400 opacity-0 hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
                aria-label={`Rename ${project.name}`}
              >
                <PencilIcon />
              </button>
            </div>
          );
        })}
        <div className="px-2">
          {creatingProject ? (
            <input
              ref={newProjectInputRef}
              type="text"
              value={newProjectName}
              disabled={savingProject}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitNewProject();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelNewProject();
                }
              }}
              onBlur={() => {
                const name = newProjectName.trim();
                if (!name) cancelNewProject();
                else void submitNewProject();
              }}
              placeholder="Project name"
              className="inline-flex w-full min-w-0 items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-900 outline-none ring-1 ring-[#5E6AD2]"
            />
          ) : (
            <FilterChip
              label="+ New project"
              tone="muted"
              size="sm"
              onClick={() => setCreatingProject(true)}
            />
          )}
          {projectError && (
            <p className="mt-1 text-[11px] text-red-600">{projectError}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
