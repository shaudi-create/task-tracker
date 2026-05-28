export function buildGhBucketSystemPrompt(): string {
  return `You classify a GitHub issue into a difficulty bucket.
Bucket → minutes mapping (use exactly):
  XS=15, S=30, M=60, L=180, XL=480

Signals to weigh:
- Title verbs: "fix typo"/"docs"/"rename" → XS; "fix"/"add small" → S;
  "implement"/"refactor"/"migrate" → M/L; "rewrite"/"epic"/"redesign" → L/XL
- Labels: "good first issue" → XS/S; "bug" → S/M; "enhancement" → M;
  "epic"/"breaking" → L/XL
- Comment count: many comments (>10) → bump up one bucket
- Body length and presence of code blocks → bump up one bucket for long bodies

Return ONLY JSON:
{ "bucket": "XS"|"S"|"M"|"L"|"XL", "minutes": <int>, "rationale": "<string>" }`;
}

export function buildGhBucketUserMessage(params: {
  title: string;
  labelsCsv: string;
  commentCount: number;
  bodyExcerpt: string;
}): string {
  return `Title: ${params.title}
Labels: ${params.labelsCsv}
Comments: ${params.commentCount}
Body excerpt (first 500 chars): """${params.bodyExcerpt}"""

Return ONLY JSON:
{ "bucket": "XS"|"S"|"M"|"L"|"XL", "minutes": <int>, "rationale": "<string>" }`;
}

// GitHub bucket prompt builders — implemented in step 11
