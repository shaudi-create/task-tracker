import { NextRequest, NextResponse } from "next/server";
import { errorResponse, zodErrorResponse } from "@/lib/api/errors";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { UpdateSettingsBody } from "@/lib/schemas/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load settings";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = UpdateSettingsBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("VALIDATION_ERROR", "No fields to update", 422);
    }

    const settings = await updateSettings(parsed.data);
    return NextResponse.json(settings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update settings";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
