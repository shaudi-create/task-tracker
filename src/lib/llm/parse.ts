import {
  extractJsonFromText,
  getAnthropicClient,
  getAnthropicModel,
  isAnthropicRateLimitError,
} from "@/lib/llm/anthropic";
import {
  buildParseUserMessage,
  PARSE_SYSTEM_STATIC,
} from "@/lib/llm/parsePrompt";
import {
  isPartialParse,
  ParseResultFields,
  type ParseApiResponse,
} from "@/lib/schemas/parse";
import { nowLocalIso } from "@/lib/utils/tz";
import { findProjectByName } from "@/lib/db/projects";

export async function parseNaturalLanguageTask(
  input: string,
): Promise<ParseApiResponse> {
  const nowIso = nowLocalIso();
  const client = getAnthropicClient();

  let text: string;
  try {
    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: PARSE_SYSTEM_STATIC,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildParseUserMessage(input, nowIso),
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("No text in model response");
    }
    text = block.text;
  } catch (err) {
    if (isAnthropicRateLimitError(err)) {
      throw Object.assign(new Error("Anthropic rate limit"), {
        status: 503,
      });
    }
    throw err;
  }

  let parsed: ParseApiResponse;
  try {
    const json = extractJsonFromText(text);
    const fields = ParseResultFields.parse(json);
    parsed = { ...fields };
  } catch {
    return { title: input, partial: true };
  }

  if (isPartialParse(parsed)) {
    parsed.partial = true;
  }

  if (parsed.project_name) {
    const project = await findProjectByName(parsed.project_name);
    parsed.project_id = project?.id ?? null;
    delete parsed.project_name;
  }

  return parsed;
}
