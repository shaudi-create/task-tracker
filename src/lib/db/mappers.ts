import type { Task } from "@/lib/schemas/task";
import type { Project } from "@/lib/schemas/project";
import {
  parseDayCeilingsJson,
  type Settings,
} from "@/lib/schemas/settings";

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  throw new Error("Invalid timestamp");
}

function toIsoNullable(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

export function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    estimate_minutes:
      row.estimate_minutes === null || row.estimate_minutes === undefined
        ? null
        : Number(row.estimate_minutes),
    actual_minutes:
      row.actual_minutes === null || row.actual_minutes === undefined
        ? null
        : Number(row.actual_minutes),
    scheduled_at: toIsoNullable(row.scheduled_at),
    due_at: toIsoNullable(row.due_at),
    location_tag: row.location_tag as Task["location_tag"],
    project_id:
      row.project_id === null || row.project_id === undefined
        ? null
        : String(row.project_id),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    subtasks: Array.isArray(row.subtasks)
      ? (row.subtasks as Task["subtasks"])
      : typeof row.subtasks === "string"
        ? (JSON.parse(row.subtasks) as Task["subtasks"])
        : [],
    source: row.source as Task["source"],
    github_issue_id:
      row.github_issue_id === null || row.github_issue_id === undefined
        ? null
        : Number(row.github_issue_id),
    github_issue_url:
      row.github_issue_url === null || row.github_issue_url === undefined
        ? null
        : String(row.github_issue_url),
    estimate_rationale:
      row.estimate_rationale === null || row.estimate_rationale === undefined
        ? null
        : String(row.estimate_rationale),
    completion_log:
      row.completion_log === null || row.completion_log === undefined
        ? null
        : typeof row.completion_log === "string"
          ? (JSON.parse(row.completion_log) as Task["completion_log"])
          : (row.completion_log as Task["completion_log"]),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    completed_at: toIsoNullable(row.completed_at),
  };
}

export function mapProjectRow(
  row: Record<string, unknown>,
  activeTaskCount?: number,
): Project {
  const project: Project = {
    id: String(row.id),
    name: String(row.name),
    created_at: toIso(row.created_at),
  };
  if (activeTaskCount !== undefined) {
    return { ...project, active_task_count: activeTaskCount };
  }
  return project;
}

export function mapSettingsRow(row: Record<string, unknown>): Settings {
  const dailyCeiling = Number(row.daily_ceiling_minutes);
  return {
    daily_ceiling_minutes: dailyCeiling,
    day_ceilings: parseDayCeilingsJson(row.day_ceilings, dailyCeiling),
    github_repo:
      row.github_repo === null || row.github_repo === undefined
        ? null
        : String(row.github_repo),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}
