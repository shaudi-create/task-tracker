import {
  extractJsonFromText,
  getAnthropicClient,
  getAnthropicModel,
  isAnthropicRateLimitError,
} from "@/lib/llm/anthropic";
import {
  buildEstimateSystemPrompt,
  buildEstimateUserMessage,
} from "@/lib/llm/estimatePrompt";
import {
  EstimateApiResponse,
  EstimateLlmResponse,
  type EstimateInputBody,
} from "@/lib/schemas/estimate";
import { applyCommuteToEstimate } from "@/lib/utils/commute";
import type { z } from "zod";

export async function estimateTaskDuration(
  input: z.infer<typeof EstimateInputBody>,
): Promise<EstimateApiResponse> {
  const locationTag = input.location_tag ?? "home";
  const systemPrompt = buildEstimateSystemPrompt();
  const client = getAnthropicClient();

  let text: string;
  try {
    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildEstimateUserMessage(
            input.title,
            input.description,
            locationTag,
          ),
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

  const json = extractJsonFromText(text);
  const llm = EstimateLlmResponse.parse(json);
  const estimate_minutes = applyCommuteToEstimate(
    llm.estimate_minutes,
    locationTag,
  );

  return EstimateApiResponse.parse({
    estimate_minutes,
    rationale: llm.rationale,
  });
}
