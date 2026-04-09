-- Fix missing RLS on referrals and stripe_events tables
-- Supabase flagged these as "Table publicly accessible"

-- 1. referrals — enable RLS + user policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Service role can manage referrals"
  ON referrals FOR ALL
  USING (auth.role() = 'service_role');

-- 2. stripe_events — enable RLS (service role only, no user access needed)
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage stripe_events"
  ON stripe_events FOR ALL
  USING (auth.role() = 'service_role');
