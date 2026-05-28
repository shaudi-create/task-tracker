"use client";

import { useCallback, useEffect, useState } from "react";
import { notifyTasksUpdated } from "@/lib/events";
import type { Settings } from "@/lib/schemas/settings";

export function SettingsForm() {
  const [ceiling, setCeiling] = useState(360);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setCeiling(data.daily_ceiling_minutes);
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_ceiling_minutes: ceiling }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to save settings");
      }
      const updated = data as Settings;
      setCeiling(updated.daily_ceiling_minutes);
      setToast("Settings saved");
      notifyTasksUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [ceiling]);

  return (
    <div className="mx-auto max-w-[600px] px-6 py-4">
      <h1 className="text-lg font-semibold text-zinc-900">Settings</h1>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-800">
              Daily workload ceiling (minutes)
            </span>
            <input
              type="number"
              min={15}
              step={15}
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
              className="w-full max-w-[200px] rounded border border-zinc-200 px-3 py-2 text-sm"
            />
            <span className="text-xs text-zinc-500">
              When today&apos;s scheduled estimates exceed this, you&apos;ll see
              a warning. Default 6 hours (360 min).
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[#5E6AD2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4e5ac2] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
