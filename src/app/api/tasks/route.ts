import { NextRequest, NextResponse } from "next/server";
import { errorResponse, zodErrorResponse } from "@/lib/api/errors";
import { createTask, listDistinctTags, listTasks } from "@/lib/db/tasks";
import { revalidateTaskViews } from "@/lib/revalidate";
import { CreateTaskBody, TaskStatus } from "@/lib/schemas/task";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    if (searchParams.get("distinct") === "tags") {
      const tags = await listDistinctTags();
      return NextResponse.json(tags);
    }

    const status = searchParams.get("status") ?? undefined;
    if (status) {
      const parsed = TaskStatus.safeParse(status);
      if (!parsed.success) {
        return errorResponse("VALIDATION_ERROR", "Invalid status filter", 422);
      }
    }

    const filter = searchParams.get("filter");
    if (
      filter &&
      filter !== "today" &&
      filter !== "week" &&
      filter !== "agenda"
    ) {
      return errorResponse(
        "VALIDATION_ERROR",
        "filter must be today, week, or agenda",
        422,
      );
    }

    const tasks = await listTasks({
      status: status ?? undefined,
      project: searchParams.get("project") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
      filter: filter as "today" | "week" | "agenda" | undefined,
      date: searchParams.get("date") ?? undefined,
    });

    return NextResponse.json(tasks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list tasks";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = CreateTaskBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { task, descriptionTrimmed } = await createTask(parsed.data);
    revalidateTaskViews();
    const response = NextResponse.json(task, { status: 201 });
    if (descriptionTrimmed) {
      response.headers.set("X-Description-Trimmed", "true");
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    if (message.includes("violates foreign key")) {
      return errorResponse("VALIDATION_ERROR", "Invalid project_id", 422);
    }
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
