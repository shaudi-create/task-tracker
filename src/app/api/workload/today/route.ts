import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { getTodayScheduledWorkloadMinutes } from "@/lib/db/workload";
import { getSettings } from "@/lib/db/settings";
import { localDateString } from "@/lib/utils/tz";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [total_minutes, settings] = await Promise.all([
      getTodayScheduledWorkloadMinutes(),
      getSettings(),
    ]);

    return NextResponse.json({
      date: localDateString(),
      total_minutes,
      ceiling_minutes: settings.daily_ceiling_minutes,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load workload";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
