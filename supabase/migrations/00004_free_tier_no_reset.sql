-- Remove monthly reset from free tier: 3 free evaluations are one-time only (no monthly reload)
create or replace function deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_action text,
  p_reference_id uuid default null,
  p_description text default null
) returns jsonb as $$
declare
  v_balance integer;
  v_free_used integer;
  v_new_balance integer;
begin
  -- Lock the row for update
  select balance, free_evaluations_used
  into v_balance, v_free_used
  from credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'No credit balance found');
  end if;

  -- Check free tier for evaluations (3 free total, one-time, no monthly reset)
  if p_action = 'evaluation' and v_free_used < 3 then
    update credit_balances
    set free_evaluations_used = free_evaluations_used + 1,
        updated_at = now()
    where user_id = p_user_id;

    -- Log free tier usage
    insert into credit_transactions (user_id, amount, balance_after, type, action, reference_id, description)
    values (p_user_id, 0, v_balance, 'free_tier', p_action, p_reference_id, coalesce(p_description, 'Free tier evaluation'));

    return jsonb_build_object('success', true, 'free_tier', true, 'balance', v_balance, 'free_remaining', 2 - v_free_used);
  end if;

  -- Check sufficient balance
  if v_balance < p_amount then
    return jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_balance, 'required', p_amount);
  end if;

  -- Deduct
  v_new_balance := v_balance - p_amount;
  update credit_balances
  set balance = v_new_balance,
      updated_at = now()
  where user_id = p_user_id;

  -- Log transaction
  insert into credit_transactions (user_id, amount, balance_after, type, action, reference_id, description)
  values (p_user_id, -p_amount, v_new_balance, 'usage', p_action, p_reference_id, p_description);

  return jsonb_build_object('success', true, 'free_tier', false, 'balance', v_new_balance, 'deducted', p_amount);
end;
$$ language plpgsql security definer;
