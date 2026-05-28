import type { z } from "zod";
import { sql } from "@/lib/db/client";
import { mapTaskRow } from "@/lib/db/mappers";
import {
  CreateTaskBody,
  CompleteTaskBody,
  normalizeSubtasks,
  normalizeTags,
  Task,
  truncateDescription,
  UpdateTaskBody,
  type Task as TaskType,
} from "@/lib/schemas/task";
import {
  addDaysToDateString,
  DEFAULT_TIMEZONE,
  localDateString,
  parseLocalDateString,
} from "@/lib/utils/tz";

export type TaskListFilters = {
  status?: string;
  project?: string;
  tag?: string;
  filter?: "today" | "week" | "agenda";
  date?: string;
};

export async function listDistinctTags(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT tag
    FROM tasks, unnest(tags) AS tag
    ORDER BY tag
  `;
  return rows.map((row) => String((row as { tag: string }).tag));
}

export async function listTasks(filters: TaskListFilters): Promise<TaskType[]> {
  const status = filters.status || null;
  const projectId = filters.project || null;
  const tag = filters.tag || null;

  let rows;

  if (filters.filter === "today") {
    const anchor = filters.date
      ? parseLocalDateString(filters.date)
      : localDateString();
    rows = await sql`
      SELECT * FROM tasks
      WHERE (
        (
          scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE ${DEFAULT_TIMEZONE})::date = ${anchor}::date
        )
        OR status = 'In Progress'
        OR (
          due_at IS NOT NULL
          AND (due_at AT TIME ZONE ${DEFAULT_TIMEZONE})::date = ${anchor}::date
        )
      )
      AND status NOT IN ('Done', 'Dropped')
      AND (${status}::text IS NULL OR status = ${status})
      AND (${projectId}::text IS NULL OR project_id = ${projectId}::uuid)
      AND (${tag}::text IS NULL OR ${tag} = ANY(tags))
      ORDER BY created_at ASC
    `;
  } else if (filters.filter === "agenda") {
    const anchor = filters.date
      ? parseLocalDateString(filters.date)
      : localDateString();
    const weekEnd = addDaysToDateString(anchor, 6);
    rows = await sql`
      SELECT * FROM tasks
      WHERE (
        (
          scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE ${DEFAULT_TIMEZONE})::date BETWEEN ${anchor}::date AND ${weekEnd}::date
        )
        OR status = 'In Progress'
      )
      ORDER BY scheduled_at ASC NULLS LAST, created_at ASC
    `;
  } else if (filters.filter === "week") {
    const anchor = filters.date
      ? parseLocalDateString(filters.date)
      : localDateString();
    const weekEnd = addDaysToDateString(anchor, 6);
    rows = await sql`
      SELECT * FROM tasks
      WHERE (
        status = 'In Progress'
        OR (
          scheduled_at IS NOT NULL
          AND (scheduled_at AT TIME ZONE ${DEFAULT_TIMEZONE})::date BETWEEN ${anchor}::date AND ${weekEnd}::date
        )
        OR (
          due_at IS NOT NULL
          AND (due_at AT TIME ZONE ${DEFAULT_TIMEZONE})::date BETWEEN ${anchor}::date AND ${weekEnd}::date
        )
      )
      AND (${status}::text IS NULL OR status = ${status})
      AND (${projectId}::text IS NULL OR project_id = ${projectId}::uuid)
      AND (${tag}::text IS NULL OR ${tag} = ANY(tags))
      ORDER BY created_at ASC
    `;
  } else {
    rows = await sql`
      SELECT * FROM tasks
      WHERE (${status}::text IS NULL OR status = ${status})
        AND (${projectId}::text IS NULL OR project_id = ${projectId}::uuid)
        AND (${tag}::text IS NULL OR ${tag} = ANY(tags))
      ORDER BY created_at ASC
    `;
  }

  return rows.map((row) =>
    Task.parse(mapTaskRow(row as Record<string, unknown>)),
  );
}

export async function getTaskById(id: string): Promise<TaskType | null> {
  const rows = await sql`SELECT * FROM tasks WHERE id = ${id}::uuid`;
  if (rows.length === 0) return null;
  return Task.parse(mapTaskRow(rows[0] as Record<string, unknown>));
}

export async function createTask(
  input: z.infer<typeof CreateTaskBody>,
): Promise<{ task: TaskType; descriptionTrimmed: boolean }> {
  const { value: description, trimmed: descriptionTrimmed } =
    truncateDescription(input.description ?? null);
  const tags = normalizeTags(input.tags);
  const subtasks = normalizeSubtasks(input.subtasks);

  const rows = await sql`
    INSERT INTO tasks (
      title,
      description,
      status,
      priority,
      estimate_minutes,
      actual_minutes,
      scheduled_at,
      due_at,
      location_tag,
      project_id,
      tags,
      subtasks,
      source,
      github_issue_id,
      github_issue_url,
      estimate_rationale,
      completion_log
    ) VALUES (
      ${input.title},
      ${description},
      ${input.status},
      ${input.priority},
      ${input.estimate_minutes ?? null},
      ${input.actual_minutes ?? null},
      ${input.scheduled_at ?? null},
      ${input.due_at ?? null},
      ${input.location_tag},
      ${input.project_id ?? null},
      ${tags},
      ${JSON.stringify(subtasks)}::jsonb,
      ${input.source},
      ${input.github_issue_id ?? null},
      ${input.github_issue_url ?? null},
      ${input.estimate_rationale ?? null},
      ${input.completion_log ? JSON.stringify(input.completion_log) : null}::jsonb
    )
    RETURNING *
  `;

  return {
    task: Task.parse(mapTaskRow(rows[0] as Record<string, unknown>)),
    descriptionTrimmed,
  };
}

export async function updateTask(
  id: string,
  patch: z.infer<typeof UpdateTaskBody>,
): Promise<{ task: TaskType | null; descriptionTrimmed: boolean }> {
  const existing = await getTaskById(id);
  if (!existing) return { task: null, descriptionTrimmed: false };

  const merged = {
    title: patch.title ?? existing.title,
    description:
      patch.description !== undefined
        ? patch.description
        : existing.description,
    status: patch.status ?? existing.status,
    priority: patch.priority ?? existing.priority,
    estimate_minutes:
      patch.estimate_minutes !== undefined
        ? patch.estimate_minutes
        : existing.estimate_minutes,
    actual_minutes:
      patch.actual_minutes !== undefined
        ? patch.actual_minutes
        : existing.actual_minutes,
    scheduled_at:
      patch.scheduled_at !== undefined
        ? patch.scheduled_at
        : existing.scheduled_at,
    due_at: patch.due_at !== undefined ? patch.due_at : existing.due_at,
    location_tag: patch.location_tag ?? existing.location_tag,
    project_id:
      patch.project_id !== undefined ? patch.project_id : existing.project_id,
    tags: patch.tags !== undefined ? patch.tags : existing.tags,
    subtasks: patch.subtasks !== undefined ? patch.subtasks : existing.subtasks,
    source: patch.source ?? existing.source,
    github_issue_id:
      patch.github_issue_id !== undefined
        ? patch.github_issue_id
        : existing.github_issue_id,
    github_issue_url:
      patch.github_issue_url !== undefined
        ? patch.github_issue_url
        : existing.github_issue_url,
    estimate_rationale:
      patch.estimate_rationale !== undefined
        ? patch.estimate_rationale
        : existing.estimate_rationale,
    completion_log:
      patch.completion_log !== undefined
        ? patch.completion_log
        : existing.completion_log,
  };

  const { value: description, trimmed: descriptionTrimmed } =
    truncateDescription(merged.description);
  const tags = normalizeTags(merged.tags);
  const subtasks = normalizeSubtasks(merged.subtasks);

  let completedAt: string | null = existing.completed_at;
  if (merged.status === "Done" && !completedAt) {
    completedAt = new Date().toISOString();
  } else if (merged.status !== "Done") {
    completedAt = null;
  }

  const rows = await sql`
    UPDATE tasks
    SET
      title = ${merged.title},
      description = ${description},
      status = ${merged.status},
      priority = ${merged.priority},
      estimate_minutes = ${merged.estimate_minutes},
      actual_minutes = ${merged.actual_minutes},
      scheduled_at = ${merged.scheduled_at},
      due_at = ${merged.due_at},
      location_tag = ${merged.location_tag},
      project_id = ${merged.project_id},
      tags = ${tags},
      subtasks = ${JSON.stringify(subtasks)}::jsonb,
      source = ${merged.source},
      github_issue_id = ${merged.github_issue_id},
      github_issue_url = ${merged.github_issue_url},
      estimate_rationale = ${merged.estimate_rationale},
      completion_log = ${merged.completion_log ? JSON.stringify(merged.completion_log) : null}::jsonb,
      completed_at = ${completedAt},
      updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING *
  `;

  return {
    task: Task.parse(mapTaskRow(rows[0] as Record<string, unknown>)),
    descriptionTrimmed,
  };
}

export async function completeTask(
  id: string,
  body: z.infer<typeof CompleteTaskBody>,
): Promise<TaskType | null> {
  const completionLog = {
    what_worked: body.what_worked?.trim() || null,
    what_blocked: body.what_blocked?.trim() || null,
  };
  const terminalState = body.terminal_state;
  const actualMinutes = body.actual_minutes ?? null;

  const rows = await sql`
    UPDATE tasks
    SET
      status = ${terminalState},
      actual_minutes = ${actualMinutes},
      completion_log = ${JSON.stringify(completionLog)}::jsonb,
      completed_at = ${terminalState === "Done" ? sql`now()` : null},
      updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING *
  `;

  if (rows.length === 0) return null;
  return Task.parse(mapTaskRow(rows[0] as Record<string, unknown>));
}

export async function softDeleteTask(id: string): Promise<TaskType | null> {
  const rows = await sql`
    UPDATE tasks
    SET status = 'Dropped', updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  if (rows.length === 0) return null;
  return Task.parse(mapTaskRow(rows[0] as Record<string, unknown>));
}
