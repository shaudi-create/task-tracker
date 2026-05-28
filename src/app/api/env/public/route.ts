import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      github_repo: process.env.GITHUB_REPO ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load env";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

