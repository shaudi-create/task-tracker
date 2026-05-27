import { NextRequest, NextResponse } from "next/server";
import { errorResponse, zodErrorResponse } from "@/lib/api/errors";
import { estimateTaskDuration } from "@/lib/llm/estimate";
import { EstimateInputBody } from "@/lib/schemas/estimate";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = EstimateInputBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const result = await estimateTaskDuration(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err && err.status === 503
        ? 503
        : 500;

    if (status === 503) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Estimation unavailable",
        503,
      );
    }

    const message =
      err instanceof Error ? err.message : "Estimation failed";
    return errorResponse("ESTIMATE_ERROR", message, 500);
  }
}
