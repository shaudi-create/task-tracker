"use client";

import { useEffect, useState } from "react";
import { DayHeader } from "@/components/DayHeader";
import { TASKS_UPDATED } from "@/lib/events";

type TodayWorkload = {
  date: string;
  total_minutes: number;
  ceiling_minutes: number;
};

type TodayWorkloadHeaderProps = {
  refreshKey?: number | string;
};

export function TodayWorkloadHeader({ refreshKey }: TodayWorkloadHeaderProps) {
  const [workload, setWorkload] = useState<TodayWorkload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/workload/today", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load workload");
        const data = (await res.json()) as TodayWorkload;
        if (!cancelled) setWorkload(data);
      } catch {
        if (!cancelled) setWorkload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    function onTasksUpdated() {
      void fetch("/api/workload/today", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: TodayWorkload | null) => {
          if (data) setWorkload(data);
        })
        .catch(() => {});
    }
    window.addEventListener(TASKS_UPDATED, onTasksUpdated);
    return () => window.removeEventListener(TASKS_UPDATED, onTasksUpdated);
  }, []);

  return <DayHeader workload={workload} loading={loading} />;
}
