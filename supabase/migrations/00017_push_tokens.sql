-- ──────────────────────────────────────────────────────────────────────
-- Migration 00017: Expo push tokens for mobile clients
--
-- Stores one row per (user_id, device_id) so a user with multiple devices
-- (phone + tablet) receives push on all of them. Tokens are upserted on
-- sign-in and on token rotation; deleted on sign-out + when Expo reports
-- DeviceNotRegistered (handled by lib/push.ts).
-- ──────────────────────────────────────────────────────────────────────

create table if not exists expo_push_tokens (
  user_id     uuid not null references auth.users(id) on delete cascade,
  device_id   text not null,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android')),
  app_version text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, device_id)
);

create index if not exists idx_expo_push_tokens_user on expo_push_tokens(user_id);
create index if not exists idx_expo_push_tokens_token on expo_push_tokens(token);

-- RLS: users can read/manage only their own tokens. Server-side push
-- dispatch uses the service role key which bypasses RLS.
alter table expo_push_tokens enable row level security;

create policy "Users can view own push tokens"
  on expo_push_tokens for select using (auth.uid() = user_id);

create policy "Users can insert own push tokens"
  on expo_push_tokens for insert with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
  on expo_push_tokens for update using (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on expo_push_tokens for delete using (auth.uid() = user_id);
