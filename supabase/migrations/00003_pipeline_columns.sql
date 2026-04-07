-- Add missing columns to pipeline_items

-- Add title column (alias for role, used by scanner/pipeline code)
alter table pipeline_items add column if not exists title text;

-- Add score column for storing evaluation result
alter table pipeline_items add column if not exists score numeric(3,1);

-- Update status check constraint to include 'done' (in addition to existing values)
alter table pipeline_items drop constraint if exists pipeline_items_status_check;
alter table pipeline_items add constraint pipeline_items_status_check
  check (status in ('pending', 'processing', 'done', 'evaluated', 'skipped', 'error'));
