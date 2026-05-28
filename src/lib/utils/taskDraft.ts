import type { SubtaskInput } from "@/lib/schemas/task";

const MAX_DESCRIPTION = 2000;

type DraftWithDetails = {
  title: string;
  description: string | null;
  subtasks: SubtaskInput[];
};

export function prepareTaskDraftForSave<D extends DraftWithDetails>(
  draft: D,
): { prepared: D; descriptionTrimmed: boolean } {
  const trimmedDesc = draft.description?.trim() ?? "";
  const descriptionTrimmed = trimmedDesc.length > MAX_DESCRIPTION;
  const description =
    trimmedDesc.length > 0
      ? descriptionTrimmed
        ? trimmedDesc.slice(0, MAX_DESCRIPTION)
        : trimmedDesc
      : null;

  const subtasks = draft.subtasks
    .map((s) => ({
      text: s.text.trim().slice(0, 200),
      done: s.done,
    }))
    .filter((s) => s.text.length > 0);

  return {
    prepared: {
      ...draft,
      title: draft.title.trim(),
      description,
      subtasks,
    },
    descriptionTrimmed,
  };
}

export const DESCRIPTION_TRIMMED_MESSAGE =
  "Description trimmed to 2000 chars.";

export function descriptionWasTrimmed(response: Response): boolean {
  return response.headers.get("X-Description-Trimmed") === "true";
}
