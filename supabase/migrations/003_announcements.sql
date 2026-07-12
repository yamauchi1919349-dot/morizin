-- Morizin announcements DB foundation.
-- Apply manually in Supabase SQL Editor after confirming the target project.
-- Run this after supabase/migrations/001_id_management.sql. This migration
-- depends on public.touch_updated_at(), which is created there. Do not run this
-- file first as a standalone migration.
-- This migration only prepares the DB tables, indexes, triggers, and RLS policies.
-- UI, API routes, unread badges, notification delivery, attachments, and audit logs
-- are intentionally left for later steps.
-- Future extension points kept here include multiple publishers, verified publisher
-- badges, prefecture/facility targeting, attachments, and audit logging.

create extension if not exists pgcrypto;

-- No existing developer marker was found in profiles or the app code.
-- Do not hard-code email addresses or UUIDs in RLS. Grant Morizin developer access
-- from Supabase Auth app_metadata, for example:
--   { "is_developer": true }
-- or
--   { "app_role": "developer" }
-- or
--   { "roles": ["developer"] }
create or replace function public.is_morizin_developer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with metadata as (
    select coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb) as app_metadata
  )
  select
    coalesce(lower(app_metadata ->> 'is_developer') in ('true', '1', 'yes'), false)
    or coalesce(app_metadata ->> 'app_role', '') = 'developer'
    or case
      when jsonb_typeof(app_metadata -> 'roles') = 'array' then (app_metadata -> 'roles') ? 'developer'
      else false
    end
  from metadata
$$;

revoke execute on function public.is_morizin_developer() from public;
grant execute on function public.is_morizin_developer() to authenticated;

create table if not exists public.announcement_publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  publisher_type text not null default 'developer',
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcement_publishers_publisher_type_check
    check (publisher_type in ('developer', 'government', 'certification_body', 'organization'))
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.announcement_publishers(id),
  title text not null,
  body text not null,
  category text not null,
  priority text not null default 'normal',
  status text not null default 'draft',
  target_scope text not null default 'all',
  published_at timestamptz,
  publish_end_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_category_check
    check (category in ('update', 'maintenance', 'certification', 'important', 'other')),
  constraint announcements_title_not_blank_check
    check (length(btrim(title)) > 0),
  constraint announcements_body_not_blank_check
    check (length(btrim(body)) > 0),
  constraint announcements_priority_check
    check (priority in ('normal', 'important', 'urgent')),
  constraint announcements_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint announcements_target_scope_check
    check (target_scope in ('all', 'prefecture', 'facility')),
  constraint announcements_published_at_required_check
    check (status <> 'published' or published_at is not null),
  constraint announcements_publish_window_check
    check (
      publish_end_at is null
      or (
        published_at is not null
        and publish_end_at > published_at
      )
    )
);

create table if not exists public.announcement_user_states (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcement_user_states_announcement_user_key unique (announcement_id, user_id)
);

alter table public.announcements
  drop constraint if exists announcements_title_not_blank_check;
alter table public.announcements
  add constraint announcements_title_not_blank_check
  check (length(btrim(title)) > 0);

alter table public.announcements
  drop constraint if exists announcements_body_not_blank_check;
alter table public.announcements
  add constraint announcements_body_not_blank_check
  check (length(btrim(body)) > 0);

alter table public.announcements
  drop constraint if exists announcements_published_at_required_check;
alter table public.announcements
  add constraint announcements_published_at_required_check
  check (status <> 'published' or published_at is not null);

alter table public.announcements
  drop constraint if exists announcements_publish_window_check;
alter table public.announcements
  add constraint announcements_publish_window_check
  check (
    publish_end_at is null
    or (
      published_at is not null
      and publish_end_at > published_at
    )
  );

create or replace function public.set_announcement_audit_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by = auth.uid();
      new.updated_by = auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    new.created_by = old.created_by;

    if auth.uid() is not null then
      new.updated_by = auth.uid();
    end if;
  end if;

  return new;
end;
$$;

insert into public.announcement_publishers (name, display_name, publisher_type, is_verified, is_active)
values ('morizin', '森zin運営', 'developer', true, true)
on conflict (name) do update
set
  display_name = excluded.display_name,
  publisher_type = excluded.publisher_type,
  is_verified = excluded.is_verified,
  is_active = excluded.is_active;

create index if not exists announcements_public_feed_idx
  on public.announcements (published_at desc)
  where status = 'published' and target_scope = 'all';

create index if not exists announcements_publisher_id_idx
  on public.announcements (publisher_id);

create index if not exists announcements_status_idx
  on public.announcements (status);

create index if not exists announcements_published_at_idx
  on public.announcements (published_at desc);

create index if not exists announcement_user_states_user_id_idx
  on public.announcement_user_states (user_id);

create index if not exists announcement_user_states_announcement_id_idx
  on public.announcement_user_states (announcement_id);

create index if not exists announcement_user_states_user_hidden_at_idx
  on public.announcement_user_states (user_id, hidden_at);

create index if not exists announcement_user_states_user_read_at_idx
  on public.announcement_user_states (user_id, read_at);

alter table public.announcement_publishers enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_user_states enable row level security;

drop trigger if exists announcement_publishers_touch_updated_at on public.announcement_publishers;
create trigger announcement_publishers_touch_updated_at
before update on public.announcement_publishers
for each row execute function public.touch_updated_at();

drop trigger if exists announcements_touch_updated_at on public.announcements;
create trigger announcements_touch_updated_at
before update on public.announcements
for each row execute function public.touch_updated_at();

drop trigger if exists announcements_set_audit_fields on public.announcements;
create trigger announcements_set_audit_fields
before insert or update on public.announcements
for each row execute function public.set_announcement_audit_fields();

drop trigger if exists announcement_user_states_touch_updated_at on public.announcement_user_states;
create trigger announcement_user_states_touch_updated_at
before update on public.announcement_user_states
for each row execute function public.touch_updated_at();

drop policy if exists "announcement_publishers_active_select" on public.announcement_publishers;
create policy "announcement_publishers_active_select"
on public.announcement_publishers
for select
to authenticated
using (is_active = true);

drop policy if exists "announcement_publishers_developer_select" on public.announcement_publishers;
create policy "announcement_publishers_developer_select"
on public.announcement_publishers
for select
to authenticated
using (public.is_morizin_developer());

drop policy if exists "announcement_publishers_developer_insert" on public.announcement_publishers;
create policy "announcement_publishers_developer_insert"
on public.announcement_publishers
for insert
to authenticated
with check (public.is_morizin_developer());

drop policy if exists "announcement_publishers_developer_update" on public.announcement_publishers;
create policy "announcement_publishers_developer_update"
on public.announcement_publishers
for update
to authenticated
using (public.is_morizin_developer())
with check (public.is_morizin_developer());

drop policy if exists "announcement_publishers_developer_delete" on public.announcement_publishers;
create policy "announcement_publishers_developer_delete"
on public.announcement_publishers
for delete
to authenticated
using (public.is_morizin_developer());

drop policy if exists "announcements_public_published_select" on public.announcements;
create policy "announcements_public_published_select"
on public.announcements
for select
to authenticated
using (
  status = 'published'
  and target_scope = 'all'
  and published_at <= now()
  and (publish_end_at is null or publish_end_at > now())
  and exists (
    select 1
    from public.announcement_publishers publisher
    where publisher.id = announcements.publisher_id
      and publisher.is_active = true
  )
);

drop policy if exists "announcements_developer_select" on public.announcements;
create policy "announcements_developer_select"
on public.announcements
for select
to authenticated
using (public.is_morizin_developer());

drop policy if exists "announcements_developer_insert" on public.announcements;
create policy "announcements_developer_insert"
on public.announcements
for insert
to authenticated
with check (
  public.is_morizin_developer()
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "announcements_developer_update" on public.announcements;
create policy "announcements_developer_update"
on public.announcements
for update
to authenticated
using (public.is_morizin_developer())
with check (
  public.is_morizin_developer()
  and updated_by = auth.uid()
);

drop policy if exists "announcements_developer_delete" on public.announcements;
create policy "announcements_developer_delete"
on public.announcements
for delete
to authenticated
using (public.is_morizin_developer());

drop policy if exists "announcement_user_states_self_select" on public.announcement_user_states;
create policy "announcement_user_states_self_select"
on public.announcement_user_states
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "announcement_user_states_self_insert" on public.announcement_user_states;
create policy "announcement_user_states_self_insert"
on public.announcement_user_states
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "announcement_user_states_self_update" on public.announcement_user_states;
create policy "announcement_user_states_self_update"
on public.announcement_user_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "announcement_user_states_self_delete" on public.announcement_user_states;
create policy "announcement_user_states_self_delete"
on public.announcement_user_states
for delete
to authenticated
using (auth.uid() = user_id);
