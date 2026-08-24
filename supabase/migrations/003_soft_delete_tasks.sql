-- 003_soft_delete_tasks.sql
-- Deliver task completion/removal as an RLS-protected UPDATE so filtered
-- Realtime subscriptions remain private and reliable across devices.

alter table public.tasks
  add column if not exists deleted_at timestamptz;

create index if not exists tasks_active_user_created_at_idx
  on public.tasks (user_id, created_at desc)
  where deleted_at is null;

-- Old deployed clients may still issue physical DELETE briefly, so the
-- existing delete policy remains in place during this backwards-compatible
-- migration. New clients use UPDATE deleted_at instead.
alter table public.tasks replica identity default;

