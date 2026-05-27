import { z } from "zod";
import {
  EstimateMinutes,
  LocationTag,
  Priority,
  Tags,
} from "@/lib/schemas/task";

export const ParseInputBody = z
  .object({
    input: z.string().trim().min(1).max(2000),
  })
  .strict();

/** Accept LLM date strings and normalize to ISO 8601 with offset. */
export const LlmDateTime = z
  .string()
  .transform((s, ctx) => {
    try {
      return normalizeLlmDateTime(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid datetime" });
      return z.NEVER;
    }
  });

function normalizeLlmDateTime(raw: string): string {
  const s = raw.trim();
  if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T23:59:59-04:00`).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return new Date(`${s}-04:00`).toISOString();
  }
  return new Date(s).toISOString();
}

export const ParseResultFields = z.object({
  title: z.string().min(1).max(200),
  priority: Priority.optional(),
  estimate_minutes: EstimateMinutes.optional(),
  due_at: LlmDateTime.optional(),
  scheduled_at: LlmDateTime.optional(),
  location_tag: LocationTag.optional(),
  tags: Tags.optional(),
  project_name: z.string().min(1).max(200).optional(),
});

export type ParseResultFields = z.infer<typeof ParseResultFields>;

export const ParseApiResponse = ParseResultFields.extend({
  partial: z.boolean().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

export type ParseApiResponse = z.infer<typeof ParseApiResponse>;

export function isPartialParse(fields: ParseResultFields): boolean {
  const { title: _title, ...rest } = fields;
  return !Object.values(rest).some(
    (v) =>
      v !== undefined &&
      v !== null &&
      !(Array.isArray(v) && v.length === 0),
  );
}
