import { NextRequest, NextResponse } from "next/server";
import {
  errorResponse,
  notFoundResponse,
  zodErrorResponse,
} from "@/lib/api/errors";
import { deleteProject, updateProject } from "@/lib/db/projects";
import { UpdateProjectBody } from "@/lib/schemas/project";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = UpdateProjectBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const project = await updateProject(id, parsed.data.name);
    if (!project) {
      return notFoundResponse("Project");
    }
    return NextResponse.json(project);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update project";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteProject(id);
    if (!deleted) {
      return notFoundResponse("Project");
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete project";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
