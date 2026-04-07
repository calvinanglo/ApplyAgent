-- Add job preference columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_arrangement text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_types text[] DEFAULT '{}';
