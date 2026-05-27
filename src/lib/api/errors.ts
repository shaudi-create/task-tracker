import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}

export function zodErrorResponse(error: ZodError) {
  return errorResponse(
    "VALIDATION_ERROR",
    "Invalid request",
    422,
    error.flatten(),
  );
}

export function notFoundResponse(resource: string) {
  return errorResponse("NOT_FOUND", `${resource} not found`, 404);
}
