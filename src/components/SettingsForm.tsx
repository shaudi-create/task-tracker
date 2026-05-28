"use client";

import { useCallback, useEffect, useState } from "react";
import { notifyTasksUpdated } from "@/lib/events";
import {
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_DAY_CEILINGS,
  type DayKey,
} from "@/lib/utils/dayCeilings";
import type { DayCeilings, Settings } from "@/lib/schemas/settings";

export function SettingsForm() {
  const [ceilings, setCeilings] = useState<DayCeilings>(DEFAULT_DAY_CEILINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setCeilings(data.day_ceilings);
      })
      .catch(() => setError("Failed to load work limits"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const setDay = useCallback((key: DayKey, value: number) => {
    setCeilings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_ceilings: ceilings }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "Failed to save work limits");
      }
      const updated = data as Settings;
      setCeilings(updated.day_ceilings);
      setToast("Work limits saved");
      notifyTasksUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save work limits",
      );
    } finally {
      setSaving(false);
    }
  }, [ceilings]);

  const handleReset = useCallback(() => {
    setCeilings({ ...DEFAULT_DAY_CEILINGS });
  }, []);

  return (
    <div className="mx-auto max-w-[600px] px-6 py-4">
      <h1 className="text-lg font-semibold text-zinc-900">Work Limits</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Set a daily minute ceiling for each day of the week. When today&apos;s
        scheduled task estimates exceed that day&apos;s ceiling, you&apos;ll see
        an amber warning.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          {DAY_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm font-medium text-zinc-800">
                {DAY_LABELS[key]}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={1440}
                  step={1}
                  value={ceilings[key]}
                  onChange={(e) => setDay(key, Number(e.target.value))}
                  className="w-24 rounded border border-zinc-200 px-2 py-1.5 text-right text-sm"
                />
                <span className="text-sm text-zinc-500">min</span>
              </div>
            </label>
          ))}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2">
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

      {!loading && (
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
          >
            Reset all to 6h (360 min)
          </button>
        </p>
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
