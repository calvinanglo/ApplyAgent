-- Generic background jobs table: decouples any long-running work from the HTTP
-- request lifetime. Used by cover-letter and resume PDF generation (and can be
-- extended to scan, pipeline, etc). Client polls /api/jobs/status?id=<id>.

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cover_letter','resume_pdf','scan','pipeline_process')),
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  input jsonb,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.background_jobs enable row level security;

create policy "Users can view own background jobs"
  on public.background_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own background jobs"
  on public.background_jobs for insert
  with check (auth.uid() = user_id);

create index if not exists idx_background_jobs_user_created
  on public.background_jobs(user_id, created_at desc);

create index if not exists idx_background_jobs_status
  on public.background_jobs(status)
  where status in ('pending','running');

create or replace function public.touch_background_jobs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_background_jobs on public.background_jobs;
create trigger trg_touch_background_jobs
  before update on public.background_jobs
  for each row execute function public.touch_background_jobs();
