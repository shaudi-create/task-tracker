import { readFileSync } from "fs";
import path from "path";

let cachedPriors: string | null = null;

export function getEstimationPriors(): string {
  if (cachedPriors === null) {
    cachedPriors = readFileSync(
      path.join(process.cwd(), "estimation_priors.md"),
      "utf8",
    );
  }
  return cachedPriors;
}

export function buildEstimateSystemPrompt(): string {
  const priors = getEstimationPriors();
  return `You estimate how long a single task will take, in minutes.
Use the user's typical durations below as priors. If the task does not
clearly match a prior, fall back to general knowledge. Return a single
integer rounded to nearest 5, plus a one-sentence rationale.

Do NOT add commute or travel time — the server adds that separately from location_tag.

Duration parsing rules (minutes only; round to nearest 5):
- "30 min" / "30 mins" / "30m" → 30
- "1 hour" / "1h" / "an hour" → 60
- "1.5 hours" / "1h 30m" / "ninety minutes" / "1 and a half hours" → 90
- "2 hours" / "2h" → 120
- "half hour" → 30
- "quarter hour" → 15
- "all day" → 480 (cap)
Critical: if the unit is hours/h, MULTIPLY by 60 (so "1.5 hours" → 90, not 15).

User's typical durations:
${priors}`;
}

export function buildEstimateUserMessage(
  title: string,
  description: string | null | undefined,
  locationTag: string,
): string {
  return `Task title: ${title}
Description: ${description ?? "none"}
Location tag: ${locationTag}

Return ONLY JSON: { "estimate_minutes": <int>, "rationale": "<string>" }`;
}
