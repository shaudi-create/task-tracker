import { z } from "zod";

export const Settings = z.object({
  daily_ceiling_minutes: z.number().int().min(1),
  github_repo: z.string().min(1).max(200).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Settings = z.infer<typeof Settings>;

export const UpdateSettingsBody = z
  .object({
    daily_ceiling_minutes: z.number().int().min(1).optional(),
    github_repo: z.string().min(1).max(200).nullable().optional(),
  })
  .strict();
