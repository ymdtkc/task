-- 002_add_talk_memos.sql
-- Signed-in-only conversation notes, isolated per user with RLS.

create table if not exists public.talk_memos (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  recipient   text        not null
                          check (char_length(btrim(recipient)) between 1 and 100),
  content     text        not null
                          check (char_length(btrim(content)) between 1 and 4000),
  importance  smallint    not null check (importance in (1, 2, 3)),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

alter table public.talk_memos
  add column if not exists deleted_at timestamptz;

create index if not exists talk_memos_active_user_importance_created_idx
  on public.talk_memos (user_id, importance desc, created_at desc)
  where deleted_at is null;

alter table public.talk_memos enable row level security;

drop policy if exists "users can select their own talk memos"
  on public.talk_memos;
create policy "users can select their own talk memos"
  on public.talk_memos
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own talk memos"
  on public.talk_memos;
create policy "users can insert their own talk memos"
  on public.talk_memos
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own talk memos"
  on public.talk_memos;
create policy "users can update their own talk memos"
  on public.talk_memos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete their own talk memos"
  on public.talk_memos;

-- A finished memo is hidden with an UPDATE rather than physically deleted.
-- Supabase can therefore apply RLS before sending the change to Realtime.
revoke all on public.talk_memos from anon;
revoke all on public.talk_memos from authenticated;
grant select, insert, update on public.talk_memos to authenticated;

-- Keep deleted row contents out of Postgres Changes. Completion is delivered
-- as an RLS-protected UPDATE, so FULL old-row replication is unnecessary.
alter table public.talk_memos replica identity default;
alter table if exists public.tasks replica identity default;

do $$
begin
  alter publication supabase_realtime add table public.talk_memos;
exception
  when duplicate_object then null;
end
$$;
