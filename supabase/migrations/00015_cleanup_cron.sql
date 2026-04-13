-- Hourly cleanup of the background_jobs and rate_limits tables via pg_cron.
-- pg_cron is enabled by default on Supabase hosted projects.
--
-- What this does:
--   1. Mark jobs stuck in 'running' for > 10 min as failed (handles crashed workers)
--   2. Delete completed/failed jobs older than 24 hours (keeps the table lean)
--   3. Purge expired rate_limit rows older than 1 hour

create or replace function public.cleanup_background_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Jobs stuck in 'running' for > 10 minutes — worker must have crashed
  update background_jobs
  set
    status     = 'failed',
    error      = 'Job timed out — automatic cleanup after 10 minutes',
    updated_at = now()
  where status = 'running'
    and updated_at < now() - interval '10 minutes';

  -- Remove old terminal rows to keep the table small and indexes fast
  delete from background_jobs
  where status in ('completed', 'failed')
    and created_at < now() - interval '24 hours';

  -- Purge expired rate-limit windows
  perform public.cleanup_rate_limits();
end;
$$;

-- Schedule: every hour at minute 0
-- cron.schedule() is idempotent — re-running this migration is safe
select cron.schedule(
  'cleanup-background-jobs',  -- unique job name
  '0 * * * *',                -- cron expression: every hour
  $$select public.cleanup_background_jobs()$$
);
