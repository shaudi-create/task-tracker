import { z } from "zod";
import {
  DAY_KEYS,
  DEFAULT_DAY_CEILINGS,
  type DayKey,
} from "@/lib/utils/dayCeilings";

const ceilingMinutes = z
  .number()
  .int()
  .min(15)
  .refine((n) => n % 15 === 0, {
    message: "ceiling minutes must be a multiple of 15",
  });

export const DayCeilings = z.object({
  mon: ceilingMinutes,
  tue: ceilingMinutes,
  wed: ceilingMinutes,
  thu: ceilingMinutes,
  fri: ceilingMinutes,
  sat: ceilingMinutes,
  sun: ceilingMinutes,
});
export type DayCeilings = z.infer<typeof DayCeilings>;

export const Settings = z.object({
  daily_ceiling_minutes: z.number().int().min(1),
  day_ceilings: DayCeilings,
  github_repo: z.string().min(1).max(200).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Settings = z.infer<typeof Settings>;

export const UpdateSettingsBody = z
  .object({
    daily_ceiling_minutes: ceilingMinutes,
    day_ceilings: DayCeilings.partial(),
    github_repo: z.string().min(1).max(200).nullable(),
  })
  .partial()
  .strict();

export function parseDayCeilingsJson(
  raw: unknown,
  fallbackDaily: number,
): DayCeilings {
  const base: Record<DayKey, number> = { ...DEFAULT_DAY_CEILINGS };
  for (const key of DAY_KEYS) {
    base[key] = fallbackDaily;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const key of DAY_KEYS) {
      const v = (raw as Record<string, unknown>)[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        base[key] = v;
      }
    }
  }

  return DayCeilings.parse(base);
}
