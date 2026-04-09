-- Add location column to pipeline_items and applications
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS location text;
