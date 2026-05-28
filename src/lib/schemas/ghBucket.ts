import { z } from "zod";

export const GhBucket = z.enum(["XS", "S", "M", "L", "XL"]);
export type GhBucket = z.infer<typeof GhBucket>;

export const BUCKET_MINUTES: Record<GhBucket, number> = {
  XS: 15,
  S: 30,
  M: 60,
  L: 180,
  XL: 480,
};

export const GhBucketLlmResponse = z.object({
  bucket: GhBucket,
  minutes: z.number().int(),
  rationale: z.string().min(1).max(300),
});
export type GhBucketLlmResponse = z.infer<typeof GhBucketLlmResponse>;

export function bucketForMinutes(minutes: number | null | undefined): GhBucket {
  if (minutes === 15) return "XS";
  if (minutes === 30) return "S";
  if (minutes === 60) return "M";
  if (minutes === 180) return "L";
  if (minutes === 480) return "XL";
  return "M";
}

// GitHub bucket Zod schemas — implemented in step 11
