-- 001_create_tasks_table.sql
-- Phase 2 Step 4 — initial schema for endlesstask cloud sync.
--
-- Creates the public.tasks table, compound index for the common
-- list-ordered-by-created_at query, an updated_at trigger, four
-- Row Level Security policies scoped to auth.uid(), and enables
-- the supabase_realtime publication so authenticated clients can
-- subscribe to INSERT / UPDATE / DELETE for their own rows.
--
-- Idempotent: every object is guarded so re-running this file in
-- the SQL Editor does not error. Safe to apply to a clean project
-- or to one that has a partial version of this schema.

-- ────────────────────────────────────────────────────────────
-- 1. Table
-- ────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text        not null default '',
  importance  smallint    not null check (importance in (1, 2, 3)),
  urgency     smallint    not null check (urgency in (1, 2, 3)),
  duration    text        not null check (duration in ('quick', 'long')),
  is_today    boolean     not null default false,
  completed   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. Index
-- ────────────────────────────────────────────────────────────
-- Every RLS-checked query filters by user_id; the list view also
-- sorts by created_at desc. A single compound index covers both.
create index if not exists tasks_user_id_created_at_idx
  on public.tasks (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 3. updated_at auto-maintenance
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ────────────────────────────────────────────────────────────
-- Enabling RLS with no policies blocks *everything* including the
-- table owner's own queries via the API. The four policies below
-- all pin to auth.uid() = user_id so an authenticated user sees
-- and touches only their own rows. UPDATE has both USING (which
-- rows can be read to update) and WITH CHECK (what the row must
-- satisfy after the update), so a user cannot change user_id to
-- another user's id mid-update.
alter table public.tasks enable row level security;

drop policy if exists "users can select their own tasks" on public.tasks;
create policy "users can select their own tasks"
  on public.tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own tasks" on public.tasks;
create policy "users can insert their own tasks"
  on public.tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own tasks" on public.tasks;
create policy "users can update their own tasks"
  on public.tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete their own tasks" on public.tasks;
create policy "users can delete their own tasks"
  on public.tasks
  for delete
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. Realtime publication
-- ────────────────────────────────────────────────────────────
-- Adding to the supabase_realtime publication lets authenticated
-- clients subscribe via supabase.channel().on('postgres_changes').
-- RLS is re-evaluated on the server for each event, so realtime
-- never leaks rows a subscriber could not SELECT directly.
--
-- `alter publication ... add table` errors if the table is already
-- a member; swallow that specific error so this migration remains
-- idempotent.
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
end
$$;
