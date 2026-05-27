# Decisions Log

## Infrastructure & Tooling
- Hosting: **Vercel Hobby** (free)
- Persistence: **Neon Postgres** (free tier)
- Stack: **Next.js (App Router, TypeScript)**
- LLM: **Claude Haiku 4.5** via Anthropic API (server-side only). Spending cap set on Anthropic side.
- Auth: **None.** Unlisted Vercel URL + spending cap. CT-log discoverability accepted as residual risk for demo window.
- Secrets in **Vercel env vars only** (GitHub PAT, AirNow API key, Anthropic API key). No DB-stored credentials.
- `.env.example` committed to repo for zip-file reproducibility.
- Build in Cursor; plan and review in Claude.

---

## Version 1 — In Scope

### Core Capabilities (JTBDs)

- **JTBD 1 — NL Task Creation.** Parse priority, estimate, deadline, location, project from a single typed input via Claude Haiku 4.5. After parse, fields render as inline editable chips (same `FilterChip` component as top-bar filters — one component, two uses). Click a chip to edit just that field; commit on enter.
  - **Failure UX (zero candidate):** modal opens anyway. Raw input becomes title; other fields blank; muted helper text *"Couldn't extract details — fill in below."*
- **JTBD 2 — GitHub Issue Ingestion.** Pull open issues from a configured repo with **bucket-based estimate** (XS / S / M / L / XL) inferred from title verbs, labels, comment count, diff size. Buckets → minutes: XS=15, S=30, M=60, L=180, XL=480. Items land in **Inbox** state; one-click accept → **Backlog**. Manual trigger only (no cron). One-way sync — GitHub is source of truth for issue state; tool never writes back. Presented as *calibrated guess, no history.*
- **JTBD 5 — Calendar Visualization.** **Week view** = flat agenda list (grouped by day, not grid/time-blocked). **Today view** = filtered Tasks list (`?filter=today`, not a bespoke layout).
- **JTBD 6 (lite) — Location-Aware Tasks + Weather/AQI Warning.** Each task gets a location tag. For outdoor-tagged tasks, check weather/AQI for the scheduled time and warn if conditions look bad. Warning only — no auto-reschedule.
  - **Weather location:** all tasks default to zip **11249** (single user, NYC-local workflow). NWS forecast lookup uses hardcoded lat/lng for 11249. AirNow uses zip directly.
  - **Thresholds:** rain probability >50%, AQI >100 (EPA scale, AirNow), temp <39°F or >89°F, sustained wind >20mph. Also warn on any active NWS alert for the location.
  - **Fetch model:** lazy server-fetch on view render. 1h TTL cached in Neon.
- **JTBD 7 (lite) — Task Logging.** On completion, log actuals (duration, what worked, what blocked) via inline form. Show "estimated X, took Y" on completed task rows. **No learning loop** — actuals are stored and displayed, not consumed by estimator.
- **JTBD 8 — Projects.** Group related tasks under named projects. Per-project filter and workload view. No sub-projects, no dependencies.

### Additional v1 Features
- **Subtasks** within a task (checklist-style, max 20 per task)
- **Tags/labels** as a cross-cutting axis (case-sensitive store; autocomplete from existing tags surfaces case variants)
- **Workload warning** — sum today's task estimates; warn when total exceeds daily ceiling. Default **6h**, user-configurable. **Real-time recalc** on add/edit/reschedule. Amber styling (border/background), positioned under estimate + due fields in the day header.
- **Estimate vs. actual** displayed on completed task rows (display only)

### Data Model
- **Task states:** `Inbox → Backlog → Scheduled → In Progress ↔ Paused → Done | Dropped`. Terminal: Done, Dropped. "All" is a UI filter, not a state.
- **Priority levels:** Urgent / High / Medium / Low
- **Estimate granularity:** 5-minute increments
- **Location tags + commute values** (minutes added to task estimate; round-trip baked in):
  - `home` = 0
  - `office` = 50
  - `outside_williamsburg` = 10
  - `outside_local` = 30
  - `outside_far` = 60
- **Description char cap:** 2,000
- **Task deletion:** soft only — "Delete" transitions to `Dropped`. No hard delete. Dropped + Done both viewable.
- **Main /tasks view:** includes `Inbox`-state tasks by default.

### Estimation Behavior (v1 — no learning)
- For typed tasks: Haiku 4.5 produces an estimate from general knowledge + a static **`estimation_priors.md`** file in the repo (user's typical durations, e.g., "client meetings = 60min, code reviews = 30min") injected into the system prompt.
- **No history matching.** No `matched_task_ids`. No confidence tiers. No seed-prompt modal.
- If LLM returns no estimate, the estimate chip in Confirm Task modal is empty and editable. No special flow.
- Final task estimate = LLM estimate + location tag's commute value.
- GitHub: bucket-based only (see JTBD 2).

### Other Behavior
- **Timezone:** store UTC, render in hardcoded `America/New_York`.
- **"Friday" said on Friday:** resolves to today; falls to next Friday only if past end-of-day.
- **Workload recalc:** real-time on every task add / edit / reschedule.
- **Past-task token context:** none sent to estimator (cut).

### Design Tokens & UX
- **Base spacing:** Tailwind defaults (4px unit), mixed scale:
  - gap-0.5 (2px) tight icon button groups · gap-1/1.5 (4/6px) filter chips · gap-2 (8px) row internals, sidebar nav, dialog headers · gap-3 (12px) form fields, section stacks · gap-4 (16px) modals
  - px-3 (12px) task row horizontal padding · px-6 / py-4 (24/16px) main content padding
- **Accent (primary):** `#5E6AD2` via `--primary`
- **Paused state color:** `#F59E0B`
- **Warnings:** ad-hoc amber (no formal warning token system)
- **Chip component:** single `FilterChip` used for both top-bar filters and parsed-field pills in Confirm Task modal
- **Status control:** 6px status dot wraps a native HTML `<select>` for full state-list transitions + hover-revealed action buttons (Done / Pause / Delete) for common transitions
- **Today view:** filter on Tasks list, no bespoke layout
- **Week view:** flat agenda list
- **Settings page:** stub (header + blurb)
- **Sidebar project counts:** active-only (excluding Done/Dropped)
- **Inbox unread count badge:** show on sidebar nav
- **Workload-warning flag:** amber border/background, positioned under estimate + due in day header

---

## Version 2 — Deferred

- **JTBD 3** — Gmail Task Extraction (needs OAuth)
- **JTBD 4** — Full time-slotting (v1 limited to rank/order)
- **JTBD 6** — Nearby events detection
- **JTBD 6** — Auto-reschedule on bad conditions
- **JTBD 7** — Estimation learning loop (and the entire history-matching system from PRD §6)
- **GitHub** — Per-user multiplier learning
- Things-style backlog horizon states (Anytime / Someday)
- Command palette / Cmd-K
- Recurring tasks
- Per-task-type weather threshold configurability
- Mobile app
- Task dependencies
- Maps Distance Matrix API (commute kept hardcoded in tag values)
- Address-level geocoding (v1 hardcodes zip 11249)
- Bespoke Today view layout
- Custom status-change dropdown (v1 uses native `<select>`)
- Warning-color design token system

---

## Additional Decisions Surfaced During Cursor Handoff (Phase 8)

These are net-new product/behavior calls made while writing the build spec. Implementation-only details (DB driver choice, ORM-or-not, etc.) are not logged here — they live in `CursorHandoff.md`.

### Behavior
- **State machine:** any → any transitions allowed. Done/Dropped can be reopened to Backlog or Scheduled. No strict DAG enforced.
- **Weather skip:** silently skip the weather check for tasks scheduled more than **48h** in the future (NWS hourly precision falls off).
- **GitHub sync cap:** maximum **100 open issues** pulled per sync. Re-sync to fetch additional pages.
- **"Friday" said on Friday:** resolves to today until 23:59 local; falls to next Friday only on Saturday or later.
- **Subtask completion:** checking a subtask does NOT auto-complete the parent task.

### UX caps and constants
- **Modal width:** 480px (locked).
- **Tag length cap:** 48 chars. **Per-task tag count cap:** 20.
- **Subtask count cap:** 20 per task.
- **Description cap:** 2000 chars; server truncates with toast notification.

### Interface details
- **Cmd-K shortcut:** placeholder text `Add a task… ⌘K` displayed in QuickCapture input, but the keyboard binding itself is NOT wired in v1 (Cmd-K deferred to v2 per earlier decision).
- **Filter shortcuts:** number keys **1–8** switch filter chips (matching position in the row).
- **Inbox badge visibility:** sidebar Inbox nav badge hidden entirely when the Inbox count is zero.

### Defaults
- **Default lat/lng for zip 11249:** `40.7081, -73.9571` (used for NWS gridpoint lookup).
- **AirNow uses zip directly:** no geocode round-trip needed for AQI.
