import { NextRequest, NextResponse } from "next/server";
import { errorResponse, zodErrorResponse } from "@/lib/api/errors";
import { parseNaturalLanguageTask } from "@/lib/llm/parse";
import { ParseInputBody } from "@/lib/schemas/parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rawInput: string | null = null;

  try {
    const body: unknown = await request.json();
    const parsed = ParseInputBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    rawInput = parsed.data.input;

    const result = await parseNaturalLanguageTask(rawInput);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err && err.status === 503
        ? 503
        : 500;

    if (status === 503) {
      return errorResponse("SERVICE_UNAVAILABLE", "Parser unavailable", 503);
    }

    if (rawInput) {
      return NextResponse.json({ title: rawInput, partial: true });
    }

    const message = err instanceof Error ? err.message : "Parse failed";
    return errorResponse("PARSE_ERROR", message, 500);
  }
}
