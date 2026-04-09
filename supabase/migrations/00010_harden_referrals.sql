-- Security hardening migration
-- 1. Atomic credit award function for referrals (no race conditions)
-- 2. Cap referrals per user
-- 3. Atomic add_credits function for Stripe webhooks (no race conditions)

-- Atomic referral credit award with row locking
CREATE OR REPLACE FUNCTION award_referral_credits(
  p_referrer_id uuid,
  p_referred_id uuid,
  p_referral_code text,
  p_reward integer DEFAULT 50
) RETURNS jsonb AS $$
DECLARE
  v_existing_ref uuid;
  v_referral_count integer;
  v_referrer_balance integer;
  v_referred_balance integer;
BEGIN
  -- Check if referral already exists (prevent double-claim)
  SELECT id INTO v_existing_ref
  FROM referrals
  WHERE referred_id = p_referred_id
  LIMIT 1;

  IF v_existing_ref IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already applied');
  END IF;

  -- Check referrer hasn't exceeded cap (max 20 referrals = 1000 credits)
  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE referrer_id = p_referrer_id AND credits_awarded = true;

  IF v_referral_count >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral limit reached');
  END IF;

  -- Self-referral check
  IF p_referrer_id = p_referred_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Lock both credit balance rows
  SELECT balance INTO v_referrer_balance
  FROM credit_balances WHERE user_id = p_referrer_id FOR UPDATE;

  SELECT balance INTO v_referred_balance
  FROM credit_balances WHERE user_id = p_referred_id FOR UPDATE;

  IF v_referrer_balance IS NULL OR v_referred_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit balance not found');
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code, credits_awarded)
  VALUES (p_referrer_id, p_referred_id, p_referral_code, true);

  -- Award credits to referrer
  UPDATE credit_balances
  SET balance = balance + p_reward, updated_at = now()
  WHERE user_id = p_referrer_id;

  INSERT INTO credit_transactions (user_id, amount, balance_after, type, action, description)
  VALUES (p_referrer_id, p_reward, v_referrer_balance + p_reward, 'free_tier', 'referral', 'Referral bonus (friend signed up)');

  -- Award credits to referred user
  UPDATE credit_balances
  SET balance = balance + p_reward, updated_at = now()
  WHERE user_id = p_referred_id;

  INSERT INTO credit_transactions (user_id, amount, balance_after, type, action, description)
  VALUES (p_referred_id, p_reward, v_referred_balance + p_reward, 'free_tier', 'referral', 'Referral bonus (signed up with code)');

  -- Mark on referred user profile
  UPDATE profiles SET referred_by = p_referral_code WHERE id = p_referred_id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_new_balance', v_referrer_balance + p_reward,
    'referred_new_balance', v_referred_balance + p_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit addition for Stripe webhooks (replaces non-atomic read-then-write)
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_action text DEFAULT 'subscription',
  p_stripe_session_id text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  -- Lock the row for update
  SELECT balance INTO v_balance
  FROM credit_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No credit balance found');
  END IF;

  v_new_balance := v_balance + p_amount;

  UPDATE credit_balances
  SET balance = v_new_balance, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, balance_after, type, action, stripe_session_id, description)
  VALUES (p_user_id, p_amount, v_new_balance, 'purchase', p_action, p_stripe_session_id, p_description);

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
