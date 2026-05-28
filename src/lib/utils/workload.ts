import { formatEstimateMinutes } from "@/lib/format";

export function formatWorkloadWarning(params: {
  totalMinutes: number;
  ceilingMinutes: number;
}): string {
  const overBy = params.totalMinutes - params.ceilingMinutes;
  return `Overbooked by ${formatEstimateMinutes(overBy)} — today's load is ${formatEstimateMinutes(params.totalMinutes)}, ceiling is ${formatEstimateMinutes(params.ceilingMinutes)}.`;
}
