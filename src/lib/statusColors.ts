import { TaskStatus } from "@/lib/schemas/task";
import type { z } from "zod";

export type TaskStatusValue = z.infer<typeof TaskStatus>;

export const STATUS_DOT_BG: Record<TaskStatusValue, string> = {
  Inbox: "bg-zinc-400",
  Backlog: "bg-zinc-400",
  Scheduled: "bg-blue-500",
  "In Progress": "bg-[#5E6AD2]",
  Paused: "bg-amber-500",
  Done: "bg-green-500",
  Dropped: "bg-zinc-400",
};

export const STATUS_TEXT: Record<TaskStatusValue, string> = {
  Inbox: "text-zinc-400",
  Backlog: "text-zinc-400",
  Scheduled: "text-blue-500",
  "In Progress": "text-[#5E6AD2]",
  Paused: "text-amber-500",
  Done: "text-green-500",
  Dropped: "text-zinc-400",
};
