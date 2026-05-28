import { localDateFromIso, localDateString } from "@/lib/utils/tz";
import type { Task } from "@/lib/schemas/task";

/** Whether a task belongs on the Today list (excludes Done/Dropped). */
export function taskMatchesToday(task: Task, dateStr?: string): boolean {
  if (task.status === "Done" || task.status === "Dropped") return false;

  const today = dateStr ?? localDateString();

  if (task.status === "In Progress") return true;

  if (
    task.scheduled_at &&
    localDateFromIso(task.scheduled_at) === today
  ) {
    return true;
  }

  if (task.due_at && localDateFromIso(task.due_at) === today) {
    return true;
  }

  return false;
}
