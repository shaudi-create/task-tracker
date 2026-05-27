"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/schemas/project";

const navItems = [
  { href: "/tasks", label: "Tasks", showInboxBadge: true },
  { href: "/week", label: "Week" },
  { href: "/github-inbox", label: "GitHub Inbox" },
  { href: "/settings", label: "Settings" },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/tasks") return pathname === "/tasks";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [inboxCount, setInboxCount] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);

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
  }, [pathname]);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="px-4 py-3 text-xs font-medium text-zinc-600">
        Task Tracker
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
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
      </nav>

      {projects.length > 0 && (
        <div className="mt-4 flex flex-col gap-0.5 px-2">
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Projects
          </div>
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-zinc-700"
            >
              <span className="truncate" title={project.name}>
                {project.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {project.active_task_count ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto px-4 py-3 text-[11px] leading-snug text-zinc-500">
        Single-user, self-hosted. Suggestions only — no autopilot.
      </div>
    </aside>
  );
}
