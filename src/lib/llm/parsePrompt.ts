import { DEFAULT_TIMEZONE } from "@/lib/utils/tz";

/** Static instructions — eligible for Anthropic prompt caching. */
export const PARSE_SYSTEM_STATIC = `You extract structured task data from a single natural-language input.
Return ONLY valid JSON matching the schema below. If a field is unclear or
absent, OMIT it — do not invent values.

Allowed fields:
- title (required): short, action-oriented
- priority: "Urgent" | "High" | "Medium" | "Low".
  Synonyms: "asap"/"critical"/"crit" → Urgent;
            "important"/"high" → High;
            "later"/"someday"/"low" → Low.
- estimate_minutes: integer, multiple of 5 (round to nearest 5)
- due_at: ISO 8601 with offset. Relative dates resolve in America/New_York:
  - "today" = current date
  - "tomorrow" = current date + 1
  - "Friday" / weekday names = next occurrence; if same day and current time
    is before 23:59 local, the named day is TODAY
- scheduled_at: ISO 8601 with offset (only if user specifies a specific
  start time)
- location_tag: one of
  "home" | "office" | "outside_williamsburg" | "outside_local" | "outside_far"
  Map "@work" or "work" context to "office".
- tags: array of strings (preserve user casing)
- project_name: string if user references a project (server resolves to id)

Return ONLY a JSON object.`;

export function buildParseUserMessage(input: string, nowIso: string): string {
  return `Current datetime: ${nowIso} (${DEFAULT_TIMEZONE})
User input: """${input}"""

Return ONLY a JSON object.`;
}
