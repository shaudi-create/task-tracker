import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  notFoundResponse,
  zodErrorResponse,
} from "@/lib/api/errors";
import { softDeleteTask, updateTask } from "@/lib/db/tasks";
import { revalidateTaskViews } from "@/lib/revalidate";
import { UpdateTaskBody } from "@/lib/schemas/task";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = UpdateTaskBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("VALIDATION_ERROR", "No fields to update", 422);
    }

    const { task, descriptionTrimmed } = await updateTask(id, parsed.data);
    if (!task) {
      return notFoundResponse("Task");
    }

    revalidateTaskViews();
    const response = NextResponse.json(task);
    if (descriptionTrimmed) {
      response.headers.set("X-Description-Trimmed", "true");
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    if (message.includes("violates foreign key")) {
      return errorResponse("VALIDATION_ERROR", "Invalid project_id", 422);
    }
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const task = await softDeleteTask(id);
    if (!task) {
      return notFoundResponse("Task");
    }
    revalidateTaskViews();
    return NextResponse.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
