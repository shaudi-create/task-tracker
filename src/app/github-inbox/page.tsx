"use client";

import { useEffect, useMemo, useState } from "react";
import { GitHubInboxRow } from "@/components/GitHubInboxRow";
import type { Task } from "@/lib/schemas/task";

type SyncResult = { created: number; skipped: number; failed: number };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data: unknown = await res.json();
  if (!res.ok) {
    const err = data as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export default function GitHubInboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchJson<Task[]>(
        "/api/tasks?status=Inbox&source=github",
      );
      // newest first
      rows.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setTasks(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function syncNow() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchJson<SyncResult>("/api/github/sync", {
        method: "POST",
      });
      setResult(res);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const emptyCopy = useMemo(
    () =>
      "Inbox is clear. Click Sync now to pull open issues from your configured repo.",
    [],
  );

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">GitHub Inbox</h1>
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={syncing}
          className="rounded bg-[#5E6AD2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4e5ac2] disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {result && (
        <p className="mt-2 text-sm text-zinc-600" role="status">
          Synced: {result.created} created, {result.skipped} skipped
          {result.failed ? `, ${result.failed} failed` : ""}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-b border-zinc-100 bg-zinc-50"
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-400">{emptyCopy}</p>
      ) : (
        <div className="mt-4">
          {tasks.map((task) => (
            <GitHubInboxRow
              key={task.id}
              task={task}
              onRemove={(id) =>
                setTasks((prev) => prev.filter((t) => t.id !== id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
