import { z } from "zod";

export const Settings = z.object({
  daily_ceiling_minutes: z.number().int().min(1),
  github_repo: z.string().min(1).max(200).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Settings = z.infer<typeof Settings>;

const ceilingMinutes = z
  .number()
  .int()
  .min(15)
  .refine((n) => n % 15 === 0, {
    message: "daily_ceiling_minutes must be a multiple of 15",
  });

export const UpdateSettingsBody = z
  .object({
    daily_ceiling_minutes: ceilingMinutes,
    github_repo: z.string().min(1).max(200).nullable(),
  })
  .partial()
  .strict();
