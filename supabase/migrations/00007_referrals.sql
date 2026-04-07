-- Referral system
-- Each user gets a unique referral code
-- When a new user signs up with a referral code, both get 50 credits

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by text;

-- Auto-generate referral codes for existing users
UPDATE profiles SET referral_code = LOWER(SUBSTR(MD5(id::text), 1, 8)) WHERE referral_code IS NULL;

-- Create referral tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  credits_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
