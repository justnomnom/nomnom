-- ============================================================================
-- Self-hosted notifications — schema for the "updates to lists you follow"
-- feature (in-app bell + Web Push).
--
-- NOTE: `supabase/migrations/*.sql` is gitignored in this repo, so the runnable
-- migration files (20260713120000_notifications.sql, ..._notification_preferences.sql,
-- ..._push_subscriptions.sql, ..._drop_novu_subscriber_id.sql) do not travel with
-- git. This file is the tracked, reviewable copy — apply it to the remote Supabase
-- project (SQL editor / `supabase db push`), then run `npm run supabase:types`.
--
-- The drop-column statement at the end is DESTRUCTIVE: run it only AFTER the
-- Novu-free code has shipped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);
-- No insert policy: inserts happen via the service-role client only.

-- Realtime: emit postgres_changes so the in-app bell updates instantly.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- notification_preferences (opt-out switches, default ON)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  list_updates_in_app boolean not null default true,
  list_updates_push boolean not null default true,
  list_updates_email boolean not null default false, -- opt-in digest
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences for select using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push endpoints)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_mutes (suppress updates from a list or creator)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_mutes (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('list', 'creator')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index if not exists notification_mutes_user_idx
  on public.notification_mutes (user_id);

alter table public.notification_mutes enable row level security;

drop policy if exists "notification_mutes_select_own" on public.notification_mutes;
create policy "notification_mutes_select_own"
  on public.notification_mutes for select using (auth.uid() = user_id);

drop policy if exists "notification_mutes_insert_own" on public.notification_mutes;
create policy "notification_mutes_insert_own"
  on public.notification_mutes for insert with check (auth.uid() = user_id);

drop policy if exists "notification_mutes_delete_own" on public.notification_mutes;
create policy "notification_mutes_delete_own"
  on public.notification_mutes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Drop the now-unused Novu column. DESTRUCTIVE — apply after the code ships.
-- ---------------------------------------------------------------------------
alter table public.users drop column if exists novu_subscriber_id;
