type GitHubIssue = {
  id: number; // global node id (numeric), used for idempotency
  html_url: string;
  title: string;
  body: string | null;
  labels: Array<{ name?: string } | string>;
  comments: number;
  pull_request?: unknown; // present for PRs in issues endpoint
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function githubHeaders(): Record<string, string> {
  const pat = requireEnv("GITHUB_PAT");
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "task-tracker",
  };
}

export async function listOpenRepoIssues(params?: {
  repo?: string;
  perPage?: number;
}): Promise<GitHubIssue[]> {
  const repo = params?.repo ?? requireEnv("GITHUB_REPO");
  const perPage = Math.min(Math.max(params?.perPage ?? 100, 1), 100);

  const url = `https://api.github.com/repos/${repo}/issues?state=open&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as GitHubIssue[];
  // Exclude PRs; GitHub returns pull requests in this endpoint.
  return data.filter((i) => !("pull_request" in i));
}

// GitHub REST client — implemented in step 11
