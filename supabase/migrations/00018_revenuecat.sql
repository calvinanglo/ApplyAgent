-- ──────────────────────────────────────────────────────────────────────
-- Migration 00018: RevenueCat support for mobile in-app purchases
--
-- Mobile (iOS App Store + Google Play) cannot use Stripe for digital
-- goods. RevenueCat wraps StoreKit + Play Billing and posts webhook events
-- back to /api/webhooks/revenuecat where we update the same `subscriptions`
-- table the Stripe webhook writes to. A single source of truth.
--
-- Adds:
--   1. provider column on subscriptions (stripe | revenuecat)
--   2. external_id column for the RevenueCat product/transaction id
--   3. revenuecat_events idempotency table (mirrors stripe_events pattern)
-- ──────────────────────────────────────────────────────────────────────

-- 1. Add provider + external_id to subscriptions
alter table subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists external_id text;

alter table subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('stripe', 'revenuecat'));

create index if not exists idx_subscriptions_provider on subscriptions(provider);
create index if not exists idx_subscriptions_external_id on subscriptions(external_id);

-- 2. Idempotency table for RevenueCat webhook events.
-- RC sends events with a unique `event.id`; we record processed ids so a
-- replayed delivery doesn't double-credit a user.
create table if not exists revenuecat_events (
  id           text primary key,           -- RC event.id
  type         text not null,              -- INITIAL_PURCHASE, RENEWAL, etc.
  user_id      uuid references auth.users(id) on delete set null,
  raw          jsonb not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_revenuecat_events_user on revenuecat_events(user_id);
create index if not exists idx_revenuecat_events_type on revenuecat_events(type);

-- RLS: webhook handler uses service role and bypasses RLS. Users don't read
-- this table directly. Lock it down with a deny-all policy.
alter table revenuecat_events enable row level security;
-- (no policies = effectively deny-all for non-service-role clients)
