import { NextRequest, NextResponse } from "next/server";
import { errorResponse, zodErrorResponse } from "@/lib/api/errors";
import { createProject, listProjects } from "@/lib/db/projects";
import { CreateProjectBody } from "@/lib/schemas/project";

export const runtime = "nodejs";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json(projects);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list projects";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = CreateProjectBody.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const project = await createProject(parsed.data.name);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create project";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
