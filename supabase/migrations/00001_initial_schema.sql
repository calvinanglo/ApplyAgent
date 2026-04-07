-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  location text,
  target_roles text[] default '{}',
  salary_min integer,
  salary_max integer,
  salary_currency text default 'CAD',
  willing_to_relocate boolean default false,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. cv_documents (markdown CVs - source of truth)
create table cv_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  version integer default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. proof_points (portfolio/project metrics)
create table proof_points (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  metrics jsonb default '{}',
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 4. credit_balances
create table credit_balances (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  balance integer not null default 0,
  free_evaluations_used integer not null default 0,
  free_evaluations_reset_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. credit_transactions (audit log)
create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount integer not null, -- positive = purchase, negative = usage
  balance_after integer not null,
  type text not null check (type in ('purchase', 'usage', 'refund', 'free_tier')),
  action text, -- 'evaluation', 'pdf', 'cover_letter', etc.
  reference_id uuid, -- links to the report/file that used credits
  stripe_session_id text,
  description text,
  created_at timestamptz default now()
);

-- 6. archetypes (user-customizable role archetypes)
create table archetypes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade, -- null = system default
  name text not null,
  description text,
  proof_point_priorities text[] default '{}',
  is_system boolean default false,
  created_at timestamptz default now()
);

-- 7. applications (tracker)
create table applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  sequence_number integer not null,
  company text not null,
  role text not null,
  score numeric(3,1),
  status text not null default 'Evaluated' check (status in ('Evaluated', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Accepted')),
  applied_date date,
  url text,
  notes text,
  has_pdf boolean default false,
  has_cover_letter boolean default false,
  report_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. reports (A-F evaluation blocks stored as JSONB)
create table reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  company text not null,
  role text not null,
  archetype text,
  score numeric(3,1),
  jd_text text,
  jd_url text,
  block_a jsonb, -- Role Summary
  block_b jsonb, -- CV Match
  block_c jsonb, -- Level & Strategy
  block_d jsonb, -- Comp & Demand
  block_e jsonb, -- Customization Plan
  block_f jsonb, -- Interview Plan
  block_g jsonb, -- Draft Application Answers
  block_h jsonb, -- Cover Letter
  keywords text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. generated_files (PDF references in Supabase Storage)
create table generated_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  report_id uuid references reports(id) on delete set null,
  file_type text not null check (file_type in ('resume', 'cover_letter')),
  storage_path text not null,
  file_name text not null,
  file_size integer,
  page_count integer,
  font_size numeric(4,2),
  keyword_coverage numeric(5,2),
  created_at timestamptz default now()
);

-- 10. portal_companies (tracked companies for scanning)
create table portal_companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  careers_url text,
  platform text check (platform in ('greenhouse', 'lever', 'ashby', 'workday', 'custom')),
  api_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 11. portal_search_queries
create table portal_search_queries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  query text not null,
  source text default 'serpapi',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 12. title_filters
create table title_filters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  filter_type text not null check (filter_type in ('positive', 'negative', 'seniority')),
  keyword text not null,
  created_at timestamptz default now()
);

-- 13. scan_history (dedup)
create table scan_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  company text,
  role text,
  source text,
  scanned_at timestamptz default now()
);

-- 14. pipeline_items (URL inbox)
create table pipeline_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  url text not null,
  company text,
  role text,
  source text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'evaluated', 'skipped', 'error')),
  report_id uuid references reports(id) on delete set null,
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- 15. story_bank (STAR+R stories)
create table story_bank (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  jd_requirement text,
  situation text,
  task text,
  action text,
  result text,
  reflection text,
  tags text[] default '{}',
  source_report_id uuid references reports(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 16. stripe_events (webhook idempotency)
create table stripe_events (
  id text primary key, -- Stripe event ID
  type text not null,
  processed_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_cv_documents_user on cv_documents(user_id);
create index idx_cv_documents_active on cv_documents(user_id, is_active);
create index idx_credit_transactions_user on credit_transactions(user_id);
create index idx_applications_user on applications(user_id);
create index idx_applications_status on applications(user_id, status);
create index idx_reports_user on reports(user_id);
create index idx_reports_company on reports(user_id, company);
create index idx_generated_files_user on generated_files(user_id);
create index idx_generated_files_report on generated_files(report_id);
create index idx_portal_companies_user on portal_companies(user_id);
create index idx_scan_history_url on scan_history(user_id, url);
create index idx_pipeline_items_user on pipeline_items(user_id, status);
create index idx_story_bank_user on story_bank(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table cv_documents enable row level security;
alter table proof_points enable row level security;
alter table credit_balances enable row level security;
alter table credit_transactions enable row level security;
alter table archetypes enable row level security;
alter table applications enable row level security;
alter table reports enable row level security;
alter table generated_files enable row level security;
alter table portal_companies enable row level security;
alter table portal_search_queries enable row level security;
alter table title_filters enable row level security;
alter table scan_history enable row level security;
alter table pipeline_items enable row level security;
alter table story_bank enable row level security;

-- Users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can manage own cv_documents" on cv_documents for all using (auth.uid() = user_id);
create policy "Users can manage own proof_points" on proof_points for all using (auth.uid() = user_id);
create policy "Users can view own credit_balances" on credit_balances for select using (auth.uid() = user_id);
create policy "Users can manage own credit_transactions" on credit_transactions for select using (auth.uid() = user_id);
create policy "Users can manage own archetypes" on archetypes for all using (auth.uid() = user_id or is_system = true);
create policy "Users can manage own applications" on applications for all using (auth.uid() = user_id);
create policy "Users can manage own reports" on reports for all using (auth.uid() = user_id);
create policy "Users can manage own generated_files" on generated_files for all using (auth.uid() = user_id);
create policy "Users can manage own portal_companies" on portal_companies for all using (auth.uid() = user_id);
create policy "Users can manage own portal_search_queries" on portal_search_queries for all using (auth.uid() = user_id);
create policy "Users can manage own title_filters" on title_filters for all using (auth.uid() = user_id);
create policy "Users can manage own scan_history" on scan_history for all using (auth.uid() = user_id);
create policy "Users can manage own pipeline_items" on pipeline_items for all using (auth.uid() = user_id);
create policy "Users can manage own story_bank" on story_bank for all using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Atomic credit deduction with row locking
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
  v_free_reset timestamptz;
  v_new_balance integer;
  v_is_free boolean := false;
begin
  -- Lock the row for update
  select balance, free_evaluations_used, free_evaluations_reset_at
  into v_balance, v_free_used, v_free_reset
  from credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'No credit balance found');
  end if;

  -- NOTE: monthly reset removed in migration 00004. Free tier is one-time only.

  -- Check free tier for evaluations (3 free total, one-time)
  if p_action = 'evaluation' and v_free_used < 3 then
    v_is_free := true;
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

-- Auto-create profile and credit balance on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  insert into public.credit_balances (user_id, balance)
  values (new.id, 0);

  return new;
end;
$$;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on cv_documents for each row execute function update_updated_at();
create trigger set_updated_at before update on credit_balances for each row execute function update_updated_at();
create trigger set_updated_at before update on applications for each row execute function update_updated_at();
create trigger set_updated_at before update on reports for each row execute function update_updated_at();
create trigger set_updated_at before update on story_bank for each row execute function update_updated_at();
