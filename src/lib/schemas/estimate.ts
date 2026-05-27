import { z } from "zod";
import { EstimateMinutes, LocationTag } from "@/lib/schemas/task";

export const EstimateInputBody = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    location_tag: LocationTag.optional().default("home"),
  })
  .strict();

export const EstimateLlmResponse = z.object({
  estimate_minutes: EstimateMinutes,
  rationale: z.string().min(1).max(500),
});

export type EstimateLlmResponse = z.infer<typeof EstimateLlmResponse>;

export const EstimateApiResponse = z.object({
  estimate_minutes: EstimateMinutes,
  rationale: z.string().min(1),
});

export type EstimateApiResponse = z.infer<typeof EstimateApiResponse>;
