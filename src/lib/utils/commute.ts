import type { z } from "zod";
import type { LocationTag } from "@/lib/schemas/task";

type LocationTagValue = z.infer<typeof LocationTag>;

/** Total commute minutes added to LLM estimate (not per-direction). */
const COMMUTE_MINUTES: Record<LocationTagValue, number> = {
  home: 0,
  office: 50,
  outside_williamsburg: 10,
  outside_local: 30,
  outside_far: 60,
};

export function getCommuteMinutes(locationTag: LocationTagValue): number {
  return COMMUTE_MINUTES[locationTag];
}

export function applyCommuteToEstimate(
  llmEstimateMinutes: number,
  locationTag: LocationTagValue,
): number {
  return llmEstimateMinutes + getCommuteMinutes(locationTag);
}
