import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  notFoundResponse,
  zodErrorResponse,
} from "@/lib/api/errors";
import { completeTask } from "@/lib/db/tasks";
import { revalidateTaskViews } from "@/lib/revalidate";
import { CompleteTaskBody } from "@/lib/schemas/task";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = CompleteTaskBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const task = await completeTask(id, parsed.data);
    if (!task) {
      return notFoundResponse("Task");
    }

    revalidateTaskViews();
    return NextResponse.json(task);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to complete task";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
