-- Replace in-memory rate limiting (resets on every cold-start/deploy) with
-- Postgres-backed atomic rate limiting. Correct across all serverless instances.
--
-- The check_rate_limit() function uses row-level locking (FOR UPDATE) to
-- guarantee atomicity without separate advisory locks.

create table if not exists public.rate_limits (
  key          text        primary key,
  count        integer     not null default 1,
  window_start timestamptz not null default now()
);

-- Service role only — no direct user access needed
alter table public.rate_limits enable row level security;

-- Atomic check-and-increment
-- Returns true  → request is within limit (counter incremented)
-- Returns false → rate limit exceeded (counter unchanged)
create or replace function public.check_rate_limit(
  p_key            text,
  p_max_count      integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count        integer;
  v_window_start timestamptz;
  v_now          timestamptz := now();
begin
  -- Lock the row so concurrent requests serialize here
  select count, window_start
  into   v_count, v_window_start
  from   rate_limits
  where  key = p_key
  for    update;

  if not found then
    -- First request ever for this key
    insert into rate_limits (key, count, window_start)
    values (p_key, 1, v_now);
    return true;
  end if;

  -- Window has expired → reset
  if extract(epoch from (v_now - v_window_start)) >= p_window_seconds then
    update rate_limits
    set    count = 1, window_start = v_now
    where  key = p_key;
    return true;
  end if;

  -- Within window: over limit?
  if v_count >= p_max_count then
    return false;
  end if;

  -- Within window and under limit: increment and allow
  update rate_limits
  set    count = count + 1
  where  key = p_key;
  return true;
end;
$$;

-- Cleanup: purge rows whose windows have been expired for > 1 hour
-- (called from the hourly cleanup cron defined in migration 00015)
create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits
  where window_start < now() - interval '1 hour';
$$;
