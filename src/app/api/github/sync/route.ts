import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { listOpenRepoIssues } from "@/lib/github/client";
import { taskExistsByGithubIssueId, createTask } from "@/lib/db/tasks";
import { CreateTaskBody } from "@/lib/schemas/task";
import { truncateDescription } from "@/lib/schemas/task";
import {
  buildGhBucketSystemPrompt,
  buildGhBucketUserMessage,
} from "@/lib/llm/ghBucketPrompt";
import {
  extractJsonFromText,
  getAnthropicClient,
  getAnthropicModel,
  isAnthropicRateLimitError,
} from "@/lib/llm/anthropic";
import { GhBucketLlmResponse } from "@/lib/schemas/ghBucket";
import { revalidateTaskViews } from "@/lib/revalidate";

export async function POST() {
  try {
    const repo = process.env.GITHUB_REPO;
    if (!repo) {
      return errorResponse("VALIDATION_ERROR", "GITHUB_REPO is not set", 422);
    }

    const issues = await listOpenRepoIssues({ repo, perPage: 100 });

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fromLastWeek = issues.filter((i) => {
      const created = new Date(i.created_at).getTime();
      return Number.isFinite(created) && created >= weekAgo;
    });
    const selected = fromLastWeek.length >= 10 ? fromLastWeek : issues.slice(0, 10);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    const client = getAnthropicClient();
    const system = buildGhBucketSystemPrompt();

    for (const issue of selected) {
      try {
        const exists = await taskExistsByGithubIssueId(issue.id);
        if (exists) {
          skipped += 1;
          continue;
        }

        const labelsCsv = Array.isArray(issue.labels)
          ? issue.labels
              .map((l) => (typeof l === "string" ? l : l.name ?? ""))
              .filter(Boolean)
              .join(", ")
          : "";

        const bodyExcerpt = (issue.body ?? "").slice(0, 500);

        let bucketMinutes = 60;
        let bucketRationale: string | null = null;
        try {
          const response = await client.messages.create({
            model: getAnthropicModel(),
            max_tokens: 256,
            system: [{ type: "text", text: system }],
            messages: [
              {
                role: "user",
                content: buildGhBucketUserMessage({
                  title: issue.title,
                  labelsCsv,
                  commentCount: issue.comments,
                  bodyExcerpt,
                }),
              },
            ],
          });

          const block = response.content.find((b) => b.type === "text");
          if (!block || block.type !== "text") {
            throw new Error("No text in model response");
          }

          const json = extractJsonFromText(block.text.trim());
          const parsed = GhBucketLlmResponse.safeParse(json);
          if (parsed.success) {
            bucketMinutes = parsed.data.minutes;
            bucketRationale = parsed.data.rationale;
          }
        } catch {
          // Keep default minutes=60 and rationale=null
        }

        const description = truncateDescription(issue.body ?? null).value;

        const body = CreateTaskBody.parse({
          title: issue.title,
          description,
          status: "Inbox",
          source: "github",
          estimate_minutes: bucketMinutes,
          estimate_rationale: bucketRationale,
          github_issue_id: issue.id,
          github_issue_url: issue.html_url,
          tags: [],
          subtasks: [],
        });

        await createTask(body);
        created += 1;
      } catch (err) {
        failed += 1;
        if (err instanceof Error && err.message.includes("duplicate key")) {
          skipped += 1;
          failed -= 1;
        }
      }
    }

    revalidateTaskViews();
    return NextResponse.json({ created, skipped, failed });
  } catch (err) {
    if (isAnthropicRateLimitError(err)) {
      return errorResponse("SERVICE_UNAVAILABLE", "LLM rate limit", 503);
    }
    const message = err instanceof Error ? err.message : "Sync failed";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
}
