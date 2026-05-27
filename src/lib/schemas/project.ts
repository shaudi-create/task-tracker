import { z } from "zod";

export const Project = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  created_at: z.string().datetime(),
  active_task_count: z.number().int().min(0).optional(),
});
export type Project = z.infer<typeof Project>;

export const CreateProjectBody = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const UpdateProjectBody = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();
