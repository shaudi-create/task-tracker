import { TaskStatus } from "@/lib/schemas/task";
import type { z } from "zod";

export type TaskStatusValue = z.infer<typeof TaskStatus>;

export const STATUS_DOT_BG: Record<TaskStatusValue, string> = {
  Inbox: "bg-yellow-500",
  Backlog: "bg-slate-500",
  Scheduled: "bg-blue-500",
  "In Progress": "bg-[#5E6AD2]",
  Paused: "bg-amber-500",
  Done: "bg-emerald-500",
  Dropped: "bg-rose-400",
};

export const STATUS_TEXT: Record<TaskStatusValue, string> = {
  Inbox: "text-yellow-500",
  Backlog: "text-slate-500",
  Scheduled: "text-blue-500",
  "In Progress": "text-[#5E6AD2]",
  Paused: "text-amber-500",
  Done: "text-emerald-500",
  Dropped: "text-rose-400",
};
