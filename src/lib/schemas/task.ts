import { z } from "zod";

export const TaskStatus = z.enum([
  "Inbox",
  "Backlog",
  "Scheduled",
  "In Progress",
  "Paused",
  "Done",
  "Dropped",
]);
export const Priority = z.enum(["Urgent", "High", "Medium", "Low"]);
export const LocationTag = z.enum([
  "home",
  "office",
  "outside_williamsburg",
  "outside_local",
  "outside_far",
]);

export const Subtask = z.object({
  text: z.string().min(1).max(200),
  done: z.boolean(),
});

export const CompletionLog = z.object({
  what_worked: z.string().nullable(),
  what_blocked: z.string().nullable(),
});

const fiveMinuteIncrement = (label: string) =>
  z
    .number()
    .int()
    .min(0)
    .refine((n) => n % 5 === 0, {
      message: `${label} must be a multiple of 5`,
    });

export const EstimateMinutes = fiveMinuteIncrement("estimate_minutes");
export const ActualMinutes = fiveMinuteIncrement("actual_minutes");

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(48, "Tag cannot exceed 48 characters");

export const Tags = z.array(tagSchema).max(20);

export const Task = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  status: TaskStatus,
  priority: Priority,
  estimate_minutes: z.number().int().min(0).nullable(),
  actual_minutes: z.number().int().min(0).nullable(),
  scheduled_at: z.string().datetime().nullable(),
  due_at: z.string().datetime().nullable(),
  location_tag: LocationTag,
  project_id: z.string().uuid().nullable(),
  tags: Tags,
  subtasks: z.array(Subtask).max(20),
  source: z.enum(["manual", "github"]),
  github_issue_id: z.number().int().nullable(),
  github_issue_url: z.string().url().nullable(),
  estimate_rationale: z.string().nullable(),
  completion_log: CompletionLog.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});
export type Task = z.infer<typeof Task>;

const writableTaskFields = {
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  status: TaskStatus.optional(),
  priority: Priority.optional(),
  estimate_minutes: EstimateMinutes.nullable().optional(),
  actual_minutes: ActualMinutes.nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  location_tag: LocationTag.optional(),
  project_id: z.string().uuid().nullable().optional(),
  tags: Tags.optional(),
  subtasks: z.array(Subtask).max(20).optional(),
  source: z.enum(["manual", "github"]).optional(),
  github_issue_id: z.number().int().nullable().optional(),
  github_issue_url: z.string().url().nullable().optional(),
  estimate_rationale: z.string().nullable().optional(),
  completion_log: CompletionLog.nullable().optional(),
};

export const CreateTaskBody = z
  .object({
    ...writableTaskFields,
    title: z.string().min(1).max(200),
    status: TaskStatus.optional().default("Inbox"),
    priority: Priority.optional().default("Medium"),
    location_tag: LocationTag.optional().default("home"),
    tags: Tags.optional().default([]),
    subtasks: z.array(Subtask).max(20).optional().default([]),
    source: z.enum(["manual", "github"]).optional().default("manual"),
  })
  .strict();

/** PATCH accepts any subset of writable fields (Zod 4 requires `.partial()`). */
export const UpdateTaskBody = z.object(writableTaskFields).partial().strict();

export const CompleteTaskBody = z.object({
  actual_minutes: ActualMinutes,
  what_worked: z.string().optional(),
  what_blocked: z.string().optional(),
});

export function truncateDescription(value: string | null | undefined): {
  value: string | null;
  trimmed: boolean;
} {
  if (value === null || value === undefined) {
    return { value: null, trimmed: false };
  }
  if (value.length <= 2000) {
    return { value, trimmed: false };
  }
  return { value: value.slice(0, 2000), trimmed: true };
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  const normalized: string[] = [];
  for (const raw of tags) {
    const t = raw.trim();
    if (!t) continue;
    if (t.length > 48) {
      throw new Error("Tag cannot exceed 48 characters");
    }
    normalized.push(t);
  }
  if (normalized.length > 20) {
    throw new Error("Cannot exceed 20 tags per task");
  }
  return normalized;
}
