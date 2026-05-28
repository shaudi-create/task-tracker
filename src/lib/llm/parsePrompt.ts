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
- estimate_minutes: integer minutes, multiple of 5 (round to nearest 5).
  Duration parsing examples:
  - "30 min" / "30 mins" / "30m" → 30
  - "1 hour" / "1h" / "an hour" → 60
  - "1.5 hours" / "1h 30m" / "ninety minutes" / "1 and a half hours" → 90
  - "2 hours" / "2h" → 120
  - "half hour" → 30
  - "quarter hour" → 15
  - "all day" → 480 (cap)
  Critical: if the unit is hours/h, MULTIPLY by 60 (so "1.5 hours" → 90, not 15).
- due_at: ISO 8601 with offset. Relative dates resolve in America/New_York:
  - "today" = current date
  - "tomorrow" = current date + 1
  - "Friday" / weekday names = next occurrence; if same day and current time
    is before 23:59 local, the named day is TODAY
- scheduled_at: ISO 8601 with offset. ONLY populate if the user explicitly states
  when they plan to start working (e.g. "Friday at 6pm", "tomorrow morning",
  "tonight at 8", "at 3"). Do NOT populate scheduled_at from a deadline mention.
  If the user only says "by Friday" or "due May 29" with no start time, omit
  scheduled_at / leave it null.
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
