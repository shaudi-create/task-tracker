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
  subtasks jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual','github')),
  github_issue_id bigint,
  github_issue_url text,
  estimate_rationale text,
  completion_log jsonb,
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
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
create index idx_weather_cache_fetched on weather_cache(fetched_at);
