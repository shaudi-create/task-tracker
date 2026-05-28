import { localDateFromIso, localDateString } from "@/lib/utils/tz";
import type { Task } from "@/lib/schemas/task";

/** Assign tasks to week day buckets (today also gets In Progress). */
export function groupTasksByWeekDay(
  tasks: Task[],
  weekDays: string[],
): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const day of weekDays) {
    map.set(day, []);
  }

  const today = localDateString();

  function add(day: string, task: Task) {
    const bucket = map.get(day);
    if (!bucket || bucket.some((t) => t.id === task.id)) return;
    bucket.push(task);
  }

  for (const task of tasks) {
    if (task.scheduled_at) {
      const day = localDateFromIso(task.scheduled_at);
      if (map.has(day)) add(day, task);
    }
    if (task.status === "In Progress" && map.has(today)) {
      add(today, task);
    }
  }

  for (const bucket of map.values()) {
    bucket.sort((a, b) => {
      const aSched = a.scheduled_at
        ? new Date(a.scheduled_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bSched = b.scheduled_at
        ? new Date(b.scheduled_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (aSched !== bSched) return aSched - bSched;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  return map;
}
