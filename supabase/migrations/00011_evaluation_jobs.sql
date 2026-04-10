-- Evaluation jobs table: decouples long-running Claude evaluation from the HTTP request lifetime.
-- Client POSTs to start a job, then polls by job id. This survives mobile tab suspension / phone sleep.

create table if not exists public.evaluation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  jd_text text not null,
  jd_url text,
  result jsonb,
  error text,
  report_id uuid references public.reports(id) on delete set null,
  score numeric,
  archetype text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.evaluation_jobs enable row level security;

-- Users can read their own jobs (for polling)
create policy "Users can view own eval jobs"
  on public.evaluation_jobs for select
  using (auth.uid() = user_id);

-- Users can insert their own jobs
create policy "Users can insert own eval jobs"
  on public.evaluation_jobs for insert
  with check (auth.uid() = user_id);

-- Users cannot update or delete directly — worker uses service role
create index if not exists idx_evaluation_jobs_user_created
  on public.evaluation_jobs(user_id, created_at desc);

create index if not exists idx_evaluation_jobs_status
  on public.evaluation_jobs(status)
  where status in ('pending','running');

-- Auto-update updated_at
create or replace function public.touch_evaluation_jobs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_evaluation_jobs on public.evaluation_jobs;
create trigger trg_touch_evaluation_jobs
  before update on public.evaluation_jobs
  for each row execute function public.touch_evaluation_jobs();
