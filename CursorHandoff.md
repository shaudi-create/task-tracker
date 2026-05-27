# Task Tracker — Cursor Build Spec

**Mission.** Build a single-user, personal task tracker with NL capture (Claude Haiku 4.5), GitHub issue ingestion with bucket estimates, weather/AQI warnings for outdoor tasks, agenda-style week view, and lightweight estimate-vs-actual logging. Linear-inspired minimal UI. Deploy to Vercel Hobby + Neon Postgres. Budget <$7/mo. No auth. Single user only.

**This file supersedes the PRD for the build.** Where it conflicts with the PRD, this wins. `Decisions.md` is the canonical decision log.

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript, RSC where it helps) |
| Hosting | Vercel Hobby (free) |
| DB | Neon Postgres (free tier). Use the **pooled** connection string for app reads/writes; unpooled only for migrations |
| Styling | Tailwind CSS |
| Schema validation | Zod (every LLM I/O and every API boundary) |
| LLM | Anthropic SDK, model `claude-haiku-4-5` |
| External APIs | AirNow (AQI), NWS (forecast + alerts), GitHub REST |
| Auth | None |

---

## 2. Repository Layout

```
/src
  /app
    /layout.tsx                        # sidebar + main column shell
    /globals.css
    /page.tsx                          # redirect → /tasks
    /tasks/page.tsx                    # main list (default landing)
    /week/page.tsx                     # agenda by day
    /github-inbox/page.tsx             # GH triage
    /settings/page.tsx                 # stub
    /api
      /parse/route.ts                  # POST: NL → structured task
      /estimate/route.ts               # POST: task → estimate_minutes
      /tasks/route.ts                  # GET list, POST create
      /tasks/[id]/route.ts             # PATCH, DELETE (→ Dropped)
      /tasks/[id]/complete/route.ts    # POST: log actuals, move to Done
      /projects/route.ts               # GET, POST
      /projects/[id]/route.ts          # PATCH, DELETE
      /settings/route.ts               # GET, PUT
      /github/sync/route.ts            # POST: pull open issues
      /weather/route.ts                # GET cached weather for date
  /components
    /Sidebar.tsx
    /TopBar.tsx
    /QuickCapture.tsx
    /FilterChip.tsx                    # used for filters AND parse pills
    /TaskRow.tsx
    /StatusDot.tsx                     # 6px dot + native <select>
    /ConfirmTaskModal.tsx
    /CompletionLogModal.tsx
    /WeekAgenda.tsx
    /DayHeader.tsx
    /GitHubInboxRow.tsx
    /WeatherWarning.tsx
    /SubtaskList.tsx
    /TagInput.tsx
    /ProjectSidebarList.tsx
  /lib
    /llm
      /anthropic.ts                    # client init
      /parsePrompt.ts                  # system + user prompt builders
      /estimatePrompt.ts
      /ghBucketPrompt.ts
    /db
      /client.ts                       # Neon pooled client
      /tasks.ts
      /projects.ts
      /settings.ts
      /weatherCache.ts
    /schemas
      /task.ts                         # Zod schemas
      /parse.ts
      /estimate.ts
      /ghBucket.ts
    /github
      /client.ts                       # octokit or fetch wrapper
    /weather
      /airnow.ts
      /nws.ts
    /utils
      /tz.ts                           # America/New_York helpers
      /commute.ts                      # location_tag → minutes
      /workload.ts                     # daily sum helpers
/migrations
  /001_initial.sql
/estimation_priors.md                  # injected into estimate system prompt
/.env.example
/README.md
/Decisions.md
/package.json
/tsconfig.json
/next.config.js
/tailwind.config.ts
```

---

## 3. Environment Variables (`.env.example`)

```
# Database (Neon)
DATABASE_URL="postgresql://USER:PASS@HOST-pooler.neon.tech/DB?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASS@HOST.neon.tech/DB?sslmode=require"

# LLM
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-haiku-4-5"

# GitHub (fine-grained PAT with read:issues; leave repo blank for first run)
GITHUB_PAT=""
GITHUB_REPO=""

# Weather
AIRNOW_API_KEY=""

# App constants
DEFAULT_ZIP="11249"
DEFAULT_LAT="40.7081"
DEFAULT_LNG="-73.9571"
DEFAULT_TIMEZONE="America/New_York"
DAILY_CEILING_MINUTES_DEFAULT="360"

# NWS requires a User-Agent
NWS_USER_AGENT="task-tracker (contact: REPLACE_ME@example.com)"
```

---

## 4. Data Model

### Postgres DDL (`/migrations/001_initial.sql`)

```sql
create extension if not exists "pgcrypto";

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null check (status in (
    'Inbox','Backlog','Scheduled','In Progress','Paused','Done','Dropped'
  )),
  priority text not null default 'Medium' check (priority in (
    'Urgent','High','Medium','Low'
  )),
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  scheduled_at timestamptz,
  due_at timestamptz,
  location_tag text not null default 'home' check (location_tag in (
    'home','office','outside_williamsburg','outside_local','outside_far'
  )),
  project_id uuid references projects(id) on delete set null,
  tags text[] not null default '{}',
  subtasks jsonb not null default '[]'::jsonb,  -- [{ text: string, done: boolean }]
  source text not null default 'manual' check (source in ('manual','github')),
  github_issue_id bigint,                       -- numeric, for idempotent sync
  github_issue_url text,
  estimate_rationale text,                       -- short text from LLM
  completion_log jsonb,                          -- { what_worked, what_blocked }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index uq_tasks_github_issue_id on tasks(github_issue_id) where github_issue_id is not null;
create index idx_tasks_status on tasks(status);
create index idx_tasks_scheduled_at on tasks(scheduled_at);
create index idx_tasks_project on tasks(project_id);

create table settings (
  id integer primary key default 1 check (id = 1),
  daily_ceiling_minutes integer not null default 360,
  github_repo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

create table weather_cache (
  cache_key text primary key,           -- "{zip}:{YYYY-MM-DDTHH}"
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
create index idx_weather_cache_fetched on weather_cache(fetched_at);
```

### TypeScript Types (`/src/lib/schemas/task.ts`)

```typescript
import { z } from 'zod';

export const TaskStatus = z.enum([
  'Inbox','Backlog','Scheduled','In Progress','Paused','Done','Dropped'
]);
export const Priority = z.enum(['Urgent','High','Medium','Low']);
export const LocationTag = z.enum([
  'home','office','outside_williamsburg','outside_local','outside_far'
]);

export const Subtask = z.object({
  text: z.string().min(1).max(200),
  done: z.boolean()
});

export const Task = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  status: TaskStatus,
  priority: Priority,
  estimate_minutes: z.number().int().min(0).nullable(),
  actual_minutes: z.number().int().min(0).nullable(),
  scheduled_at: z.string().datetime().nullable(),
  due_at: z.string().datetime().nullable(),
  location_tag: LocationTag,
  project_id: z.string().uuid().nullable(),
  tags: z.array(z.string().min(1).max(48)).max(20).default([]),
  subtasks: z.array(Subtask).max(20).default([]),
  source: z.enum(['manual','github']),
  github_issue_id: z.number().int().nullable(),
  github_issue_url: z.string().url().nullable(),
  estimate_rationale: z.string().nullable(),
  completion_log: z.object({
    what_worked: z.string().nullable(),
    what_blocked: z.string().nullable()
  }).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable()
});
export type Task = z.infer<typeof Task>;
```

---

## 5. LLM Prompts

Hardcode these in `/src/lib/llm/*Prompt.ts`. Every output validated with Zod before persisting; on parse fail, return a structured error to the UI (caller handles fallback).

### Parse (`parsePrompt.ts`)

**System prompt (template):**
```
You extract structured task data from a single natural-language input.
Return ONLY valid JSON matching the schema below. If a field is unclear or
absent, OMIT it — do not invent values.

Allowed fields:
- title (required): short, action-oriented
- priority: "Urgent" | "High" | "Medium" | "Low".
  Synonyms: "asap"/"critical"/"crit" → Urgent;
            "important"/"high" → High;
            "later"/"someday"/"low" → Low.
- estimate_minutes: integer, multiple of 5 (round to nearest 5)
- due_at: ISO 8601 with offset. Relative dates resolve in America/New_York:
  - "today" = current date
  - "tomorrow" = current date + 1
  - "Friday" / weekday names = next occurrence; if same day and current time
    is before 23:59 local, the named day is TODAY
- scheduled_at: ISO 8601 with offset (only if user specifies a specific
  start time)
- location_tag: one of
  "home" | "office" | "outside_williamsburg" | "outside_local" | "outside_far"
- tags: array of strings (preserve user casing)
- project_name: string if user references a project (server resolves to id)

Current datetime: {NOW_ISO} (America/New_York)
User input: """{INPUT}"""

Return ONLY a JSON object.
```

**Zod schema for the response:** all fields optional except `title`.

### Estimate (`estimatePrompt.ts`)

**System prompt (template):**
```
You estimate how long a single task will take, in minutes.
Use the user's typical durations below as priors. If the task does not
clearly match a prior, fall back to general knowledge. Return a single
integer rounded to nearest 5, plus a one-sentence rationale.

User's typical durations:
{ESTIMATION_PRIORS}

Task title: {TITLE}
Description: {DESCRIPTION_OR_NONE}
Location tag: {LOCATION_TAG}

Return ONLY JSON: { "estimate_minutes": <int>, "rationale": "<string>" }
```

`{ESTIMATION_PRIORS}` is the literal contents of `/estimation_priors.md` (file is committed; user edits to bias the estimator).

**Important:** the location tag's commute value (see `commute.ts`) is added by the server **after** the LLM returns its estimate. Do not ask the model to add commute.

### GitHub bucket (`ghBucketPrompt.ts`)

```
You classify a GitHub issue into a difficulty bucket.
Bucket → minutes mapping (use exactly):
  XS=15, S=30, M=60, L=180, XL=480

Signals to weigh:
- Title verbs: "fix typo"/"docs"/"rename" → XS; "fix"/"add small" → S;
  "implement"/"refactor"/"migrate" → M/L; "rewrite"/"epic"/"redesign" → L/XL
- Labels: "good first issue" → XS/S; "bug" → S/M; "enhancement" → M;
  "epic"/"breaking" → L/XL
- Comment count: many comments (>10) → bump up one bucket
- Body length and presence of code blocks → bump up one bucket for long bodies

Title: {TITLE}
Labels: {LABELS_CSV}
Comments: {COMMENT_COUNT}
Body excerpt (first 500 chars): """{BODY_EXCERPT}"""

Return ONLY JSON:
{ "bucket": "XS"|"S"|"M"|"L"|"XL", "minutes": <int>, "rationale": "<string>" }
```

### Cost discipline

- Use Anthropic prompt caching for the system prompt (caches ~90% off cached input). Set the system block to be cacheable.
- Truncate body excerpts to 500 chars before sending.
- No history matching, no past-task context passed to the estimator — by design.

---

## 6. API Routes — contracts

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /api/parse | `{ input: string }` | parsed fields (all optional except title) |
| POST | /api/estimate | `{ title, description?, location_tag }` | `{ estimate_minutes, rationale }`. Server adds commute_minutes after LLM call. |
| POST | /api/tasks | `Partial<Task>` (no id/timestamps) | created Task |
| GET | /api/tasks | query: `?status=&project=&tag=&filter=today\|week&date=` | `Task[]` |
| PATCH | /api/tasks/[id] | `Partial<Task>` | updated Task |
| DELETE | /api/tasks/[id] | — | task with `status='Dropped'` (soft) |
| POST | /api/tasks/[id]/complete | `{ actual_minutes, what_worked?, what_blocked? }` | updated Task with `status='Done'`, `completed_at`, `completion_log` |
| GET | /api/projects | — | `Project[]` (each with active_task_count) |
| POST | /api/projects | `{ name }` | created Project |
| PATCH | /api/projects/[id] | `{ name }` | renamed |
| DELETE | /api/projects/[id] | — | deleted; tasks have `project_id=NULL` |
| GET | /api/settings | — | Settings |
| PUT | /api/settings | `Partial<Settings>` | Settings |
| POST | /api/github/sync | — | `{ created: number, skipped: number, failed: number }` |
| GET | /api/weather | `?date=YYYY-MM-DDTHH` | `{ rain_prob, temp_f, wind_mph, aqi, alerts: string[], cached_at }` |

**Error contract:** all routes return `{ error: { code, message, details? } }` on failure with appropriate HTTP status. Zod parse failures → 422.

---

## 7. Core Behavior

### "Today" filter logic
A task is "today" if any of:
- `scheduled_at` falls within current local day
- `status = 'In Progress'`
- `due_at` falls within current local day

### Week view (agenda)
- Flat list, grouped by day (today + next 6).
- For each day: `DayHeader` showing day name + date, total estimated minutes for the day, count of tasks due that day. Amber workload-warning band under the summary if total > `daily_ceiling_minutes`.
- Day body: TaskRows for tasks with `scheduled_at` on that day, sorted by `scheduled_at`.
- Unscheduled tasks do NOT appear in week view; main `/tasks` view shows them.

### Workload warning recalculation
- Pure server function: `getDayLoad(date)` returns total estimated minutes for tasks with `scheduled_at` on that date, statuses in `{Scheduled, In Progress, Paused}`.
- Client revalidates after any task add/edit/reschedule/state-change touching today's tasks. Use Next.js `revalidatePath`/`revalidateTag` from the API handlers; the UI re-renders fresh.

### Weather check
- Only fires for tasks with `location_tag` starting with `outside_*`.
- Cache key: `"{DEFAULT_ZIP}:{YYYY-MM-DDTHH}"` rounded to scheduled hour.
- TTL: 60 minutes. On cache miss, fetch both AirNow (AQI by zip) and NWS (forecast + alerts using `DEFAULT_LAT/LNG`).
- Skip silently if `scheduled_at` is more than 48h out (NWS hourly precision falls off; coarser daily window unreliable beyond that).
- On API failure: render `Unavailable` in the warning slot; never block the row.

**Trigger logic (any one fires the warning):**
- `rain_prob > 50`
- `aqi > 100`
- `temp_f < 39 || temp_f > 89`
- `wind_mph > 20` sustained
- `alerts.length > 0` (any active NWS alert)

### GitHub sync
- Pulls `GET /repos/{GITHUB_REPO}/issues?state=open&per_page=100`. Paginate if needed but cap at 100 issues per sync for v1.
- For each issue not already in DB (by `github_issue_id`), run `ghBucketPrompt` → create task with `status='Inbox'`, `source='github'`, `estimate_minutes` from bucket, `estimate_rationale` from LLM, `github_issue_id` + `github_issue_url` populated, `title` from issue title.
- Idempotent: existing `github_issue_id` rows are skipped (counted as `skipped`).
- One-way: tool never writes to GitHub.

### Task state machine
- All transitions are user-driven via the status dot's `<select>` or the hover-revealed action buttons.
- Allowed transitions: any → any. (Simpler than enforcing a strict DAG; user is the only one editing.) Terminal states (`Done`, `Dropped`) can be reopened by moving back to `Backlog` or `Scheduled`.
- `DELETE /api/tasks/[id]` always sets `status='Dropped'`. No hard delete in v1.
- `POST /api/tasks/[id]/complete` sets `status='Done'`, fills `completed_at`, and stores `actual_minutes` + `completion_log`.

### NLP parse failure handling
- If Zod fails to parse the LLM response, or the LLM returns no fields beyond title: server returns `{ title: <raw_input>, partial: true }`.
- Client opens `ConfirmTaskModal` with title pre-filled, other fields empty, and a muted line: *"Couldn't extract details — fill in below."*

### Tags
- Stored case-sensitive (preserve user input).
- `TagInput` autocompletes from existing distinct tags across all tasks; suggestions surface case variants (so user sees `#Work` exists if they type `work`).
- Tag length cap: 48 chars. Per-task tag count cap: 20.

### Timezone
- All DB timestamps are UTC.
- All rendering and NLP date resolution use `America/New_York` (hardcoded).
- `/lib/utils/tz.ts` provides: `nowLocal()`, `toLocalISO(date)`, `parseLocalDate(input)`, `startOfDay(date)`, `endOfDay(date)`.

---

## 8. Components — visual spec

### Layout
- **Sidebar:** fixed 220px, left. Top: app name (small text). Nav items (Tasks, Week, GitHub Inbox, Settings). Active nav = white background, neutral text (NOT accent). Inbox nav item shows an unread count badge (count = tasks with `status='Inbox'`). Projects section below nav with name + active count. Footer: small muted text "Single-user, self-hosted. Suggestions only — no autopilot."
- **Main column:** rest of viewport. Sticky `TopBar` (QuickCapture + FilterChips). Content below with `px-6 py-4`.
- **No persistent page title** in main column — sidebar indicates location.

### Tokens
- Primary/accent: `--primary: #5E6AD2`
- Paused color: `#F59E0B`
- Warnings: ad-hoc amber (`border-amber-400 bg-amber-50`). No formal warning token.
- Spacing: Tailwind defaults (mixed). Specifically: `gap-0.5` task-row icon groups; `gap-1`/`gap-1.5` filter chips; `gap-2` row internals & dialog headers; `gap-3` form fields; `gap-4` modal internals. `px-3` task row padding; `px-6 py-4` main content padding.
- Typography: Inter, fallback IBM Plex Sans. Body `text-sm` (14px) regular. Metadata `text-xs` (12px) muted. Section labels `text-[11px] uppercase tracking-wide text-muted`. Headings `text-lg font-semibold`. No serifs.

### Components

**`QuickCapture`** — full-width input in TopBar, placeholder `Add a task… ⌘K`. Enter triggers `/api/parse` → opens `ConfirmTaskModal`. Esc clears. Pending state: subtle spinner suffix. `⌘K` not wired in v1 (deferred), but the placeholder text shows the affordance.

**`FilterChip`** — generic chip. Variants via props:
- `tone`: `neutral | accent | amber | muted`
- `size`: `sm | md`
- `editable`: when true, click expands an inline editor (text input or date picker depending on `kind` prop: `text | date | datetime | select`).

Used in two places: top-bar filter row (one chip per status filter + "All"); inside `ConfirmTaskModal` as parsed-field pills (title, due, location, project, priority, estimate).

**`TaskRow`** — 40px height single line:
```
[StatusDot] [title (truncated)] ... [due | est | project | weather?] [hover actions]
```
- StatusDot: 6px circle, color by state (see table). Wraps a transparent native `<select>` covering the dot click area so users can change state via browser dropdown.
- Title truncates with ellipsis at row width.
- Right metadata: muted `text-xs`. Skips fields that are null.
- WeatherWarning chip appears in metadata slot when outdoor + thresholds tripped.
- Hover-revealed action buttons (right-anchored, opacity 0 → 1 over 100ms): Done, Pause, Delete. Done = checkmark icon; Pause = pause icon; Delete = X icon (Delete transitions to Dropped, not hard delete).
- Done rows: title muted. Dropped rows: title muted + strikethrough.
- Hairline divider between rows. No card backgrounds.

**Status dot colors:**
| Status | Color |
|---|---|
| Inbox / Backlog | `bg-zinc-400` (gray) |
| Scheduled | `bg-blue-500` |
| In Progress | `bg-[#5E6AD2]` (accent) |
| Paused | `bg-[#F59E0B]` |
| Done | `bg-green-500` |
| Dropped | gray + strikethrough on title |

**`ConfirmTaskModal`** — 480px wide, centered, white surface, 8px radius, hairline shadow. Backdrop `rgba(0,0,0,0.3)`.
- Header: title input as a large FilterChip (`editable`, `kind='text'`) + close button.
- Body: FilterChips for each parsed/parseable field — due, scheduled_at, location_tag (select), priority (select), estimate_minutes, project. Empty chips show placeholder text (`Set due…`, `Estimate…`).
- Below estimate chip: muted `estimate_rationale` from LLM in one line.
- If `partial=true` from parse: amber inline note "Couldn't extract details — fill in below."
- Footer: Cancel (secondary, left) / Add task (primary, right). `⌘↵` saves, Esc cancels.

**`CompletionLogModal`** — opens when user clicks Done. Three fields: actual minutes (number input, 5-min increments), "What worked?" (textarea, optional), "What blocked you?" (textarea, optional). Footer: Cancel / Log & Mark Done.

**`DayHeader`** — used in `WeekAgenda`. Layout:
```
[Day name, date] ... [Total: 5h 30m] [3 due]
[amber workload-warning band only if total > ceiling]
```
- Workload band: `border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900` with text like `Overbooked by 45m`. Positioned directly under estimate+due summary line; full width.

**`WeekAgenda`** — vertically stacked DayHeader + TaskRows for the day. No grid. Empty days show one muted line `No tasks scheduled.`

**`GitHubInboxRow`** — same skeleton as TaskRow but with prominent bucket badge (`XS/S/M/L/XL`) and accept (✓) / dismiss (✕) hover buttons. Accept transitions Inbox → Backlog. Dismiss transitions Inbox → Dropped.

**`WeatherWarning`** — small amber pill: `⚠ Rain 70%`, `⚠ AQI 142`, etc. Tooltip on hover shows all triggered conditions + alerts.

**`SubtaskList`** — checklist in task detail. Each row: checkbox + text. Add button at bottom. Checking a subtask does NOT auto-complete parent task. Max 20 enforced client + server.

**`TagInput`** — text input with autocomplete dropdown sourced from `/api/tasks?distinct=tags` (returns distinct tags across all tasks). Pressing Enter or comma commits the tag as a chip.

**`ProjectSidebarList`** — list of projects with active-count badge. Click to filter Tasks view by project. Right-click or hover overflow: rename, delete (with confirm).

### Filter chips (top bar, on /tasks)
- Row: `All · Inbox · Backlog · Scheduled · In Progress · Paused · Done · Dropped`
- Active = `tone='accent'`, others `tone='neutral'`.
- Number keys 1–8 also switch filter (matching position).

### Empty states (every view)
One muted line, centered horizontally, top-padded by `py-8`. Examples:
- Tasks: `Nothing here yet. Try typing a task above.`
- Week: `Nothing scheduled this week.`
- GitHub Inbox: `Inbox is clear. Sync the repo to pull issues.` + Sync button.
- Project filter: `No tasks in this project.`

### Settings page (stub)
Single column, max-width 600px. Header: "Settings". Brief paragraph: "Configure your daily ceiling and connected repo." Two fields:
- Daily ceiling (minutes, number input, default 360).
- GitHub repo (`owner/repo` text input). On save: PUT /api/settings.

That is the entire v1 settings page. No design polish required.

### Loading / error states
- Page-level loading: skeleton rows (3 placeholder TaskRows with shimmer).
- API failure on weather: render `Unavailable` in slot, muted; do not crash the row.
- API failure on parse: surface inline in modal (`Couldn't reach the parser — fill in below.`).
- API failure on sync: render `Synced N of M — retry?` with retry button.
- Toast (small, bottom-right) on save failures: `Couldn't save — retry?` with retry. No silent loss.

---

## 9. Acceptance Criteria

### Parse
- [ ] `"finish slides by friday 2hrs"` → title `finish slides`, due_at next Friday EOD local, estimate 120
- [ ] `"asdkfjasdf"` → modal opens with title `asdkfjasdf`, all other fields blank, partial note shown
- [ ] `"review PR @work tomorrow urgent"` → title `review PR`, location `office`, due tomorrow, priority `Urgent`
- [ ] Chips individually editable; editing one does not reset others
- [ ] Esc clears QuickCapture input without submitting
- [ ] Priority synonyms map correctly (`asap`/`crit` → Urgent; `later` → Low)
- [ ] "Friday" said on Friday at 2pm resolves to TODAY; on Friday at 11pm still resolves to TODAY; on Saturday resolves to next Friday

### Estimation
- [ ] `/api/estimate` returns integer multiple of 5 and a non-empty rationale
- [ ] Estimate displayed in modal includes commute add for outside_* tags (LLM estimate + commute_minutes)
- [ ] Empty/null estimate is allowed; chip shows placeholder and remains editable

### GitHub
- [ ] `/api/github/sync` pulls open issues only
- [ ] Each new issue gets bucket + minutes mapping
- [ ] Issues land in `Inbox` status
- [ ] Accept moves to `Backlog`, preserves `github_issue_url`
- [ ] Re-syncing is idempotent (no duplicates); response counts skipped
- [ ] Sync with no GITHUB_REPO configured shows the config prompt empty state

### Weather
- [ ] Outdoor task with rain_prob>50 shows warning chip
- [ ] AirNow failure → "Unavailable" in slot, row still renders
- [ ] `home`/`office` tasks do NOT trigger weather fetch
- [ ] Cache hit within 60 min serves from `weather_cache`
- [ ] Tasks scheduled >48h out skip weather check silently

### State machine
- [ ] Every state reachable from any other state via dot's `<select>`
- [ ] `Done`/`Dropped` can be reopened to `Backlog` without error
- [ ] Active filters update live when a task's state changes

### Workload warning
- [ ] Sum of today's estimates >ceiling → amber band appears in DayHeader
- [ ] Removing or rescheduling a task drops total → band clears
- [ ] Changing ceiling in Settings updates threshold immediately on next render

### Completion logging
- [ ] Done button opens CompletionLogModal
- [ ] actual_minutes required, log fields optional
- [ ] Completed row shows "estimated Xm, took Ym" in metadata

### Sidebar
- [ ] Project counts show active-only (excluding Done/Dropped)
- [ ] Inbox unread badge shows count of `Inbox`-state tasks; hidden when zero

### General
- [ ] All views have an empty state
- [ ] Cold-start latency (Neon wake) shows skeleton, never blank
- [ ] No localStorage / sessionStorage usage

---

## 10. Edge Cases (build for these)

| Case | Behavior |
|---|---|
| LLM returns malformed JSON | Zod parse fails → modal opens with partial state; user fills manually |
| Anthropic 429 / cap hit | Parse + estimate return 503; UI: `Estimation unavailable — fill manually` |
| Neon cold-start (3–5s) | Skeleton on first page load; no crash |
| GitHub PAT expired | `/api/github/sync` returns 401; UI shows `Repo unreachable — check token` |
| GitHub repo with >100 open issues | Cap at 100/sync; show notice `Showing first 100; sync again for more` |
| GitHub issue closed externally then reopened | If `github_issue_id` already exists in DB, skip (one-way sync; user manages state in-app) |
| Task in In Progress past midnight | Stays In Progress; Today view shows it (per Today filter logic) |
| Project deleted while task open | Task `project_id` → NULL; open detail view re-fetches and renders without project chip |
| AirNow no data for zip | Treat as Unavailable; do not warn |
| Forecast for date >48h | Skip silently |
| User pastes multi-line task | Treat newlines as part of title; preserve in DB |
| Two tasks scheduled at same minute | Allowed; week view sorts deterministically by created_at as tiebreak |
| Subtask edited after parent → Done | Parent stays Done; subtask edit persists |
| Empty actual_minutes on complete | Block submit; show inline error `Enter how long it took` |
| Multi-line description >2000 chars | Server truncates with toast `Description trimmed to 2000 chars` |
| Tag containing whitespace | Trim and reject if empty after trim; cap at 48 chars |
| DST switch (Nov 2 / Mar 8) | All math via `tz.ts` using Intl.DateTimeFormat with `America/New_York` |

---

## 11. Build Sequence (Cursor — tackle in this order)

Each step is independently verifiable; don't move on until acceptance for that step works.

1. **Scaffold.** `npx create-next-app@latest` with App Router + TS + Tailwind. Add Tailwind config. Set up `/src` structure.
2. **DB + migration.** Provision Neon. Run `001_initial.sql` against unpooled URL. Add `lib/db/client.ts` using pooled URL with `@neondatabase/serverless`.
3. **CRUD APIs (no LLM yet).** Tasks, Projects, Settings routes. Hard-coded location tag in test inputs.
4. **TaskRow + StatusDot + filter chips.** Render seeded data. Verify state transitions via native `<select>`. Hover actions wired.
5. **QuickCapture + ConfirmTaskModal + /api/parse.** Anthropic client. Parse prompt. Zod-validated response. Partial-state fallback.
6. **/api/estimate.** Estimate prompt with `estimation_priors.md` injection. Commute add. Wire to modal.
7. **Sidebar.** Nav, project list with active counts, Inbox unread badge.
8. **CompletionLogModal + actuals display.** Wire to Done action.
9. **Workload warning + DayHeader.** Real-time recalc on task changes.
10. **WeekAgenda.** Day grouping, sorting.
11. **GitHub sync.** PAT auth, bucket prompt, idempotent inserts. GitHubInboxRow.
12. **Weather + WeatherWarning.** AirNow, NWS, cache, thresholds.
13. **Settings page.** Stub with daily ceiling + repo fields.
14. **Empty / error / loading states.** Sweep every view.
15. **Polish & deploy.** Push to GitHub. Connect Vercel. Set env vars. Deploy. Smoke test on prod URL.

If you hit the time wall before #11–14, ship what works. Don't half-build a feature; cut from the bottom.

---

## 12. README content (for the zip)

The repo should ship with a `README.md` covering:

1. **What this is.** One-paragraph mission summary (top of this doc).
2. **Live demo.** Vercel URL (filled in after deploy).
3. **Stack.** Bullet list of the tech stack table above.
4. **Local setup:**
   ```bash
   git clone <repo>
   cd <repo>
   npm install
   cp .env.example .env.local
   # fill in env vars
   psql "$DATABASE_URL_UNPOOLED" -f migrations/001_initial.sql
   npm run dev
   ```
5. **Deploying your own.** Steps: connect Neon → create DB → run migration → push repo to GitHub → import in Vercel → set env vars → deploy.
6. **Known limitations.** Single user; no auth; weather hardcoded to NYC zip 11249; manual GitHub sync only; no learning loop; etc.
7. **Decisions log.** Pointer to `Decisions.md` in the repo root.
8. **Editing the estimator.** Pointer to `estimation_priors.md` — explain that editing this file biases future estimates.

---

## 13. Notes for Cursor

- Use **Next.js Server Actions** for mutations where they simplify code; API routes for everything Cursor doesn't want to mix into a page (especially GitHub sync and parse/estimate).
- **No client-side API keys, ever.** All LLM and external calls go through `/api/*`.
- Use `@neondatabase/serverless` driver (NOT pg) for compatibility with Edge runtime; but keep API routes on Node runtime so the Anthropic SDK works without polyfills.
- Don't install drizzle/prisma — raw SQL via tagged template literals is faster to ship for this scope.
- Don't add a tests directory. Acceptance is manual via Section 9 + Section 10 walkthrough.
- Don't add analytics, error tracking, or auth scaffolding.
- Don't add localStorage/sessionStorage — server is source of truth.
- Resist refactoring the file layout. If Cursor wants to "improve" the structure, decline.
