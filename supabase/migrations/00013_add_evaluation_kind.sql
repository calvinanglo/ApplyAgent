-- Allow 'evaluation' as a valid background_jobs kind so the evaluate route can
-- use the same job-queue pattern as cover-letter and resume PDF generation.
-- This lets evaluations run inside after() for the full 60s Vercel budget
-- without tying up the HTTP request, so the client can poll for results.

alter table public.background_jobs
  drop constraint if exists background_jobs_kind_check;

alter table public.background_jobs
  add constraint background_jobs_kind_check
  check (kind in ('cover_letter','resume_pdf','scan','pipeline_process','evaluation'));
