-- ID management foundation for the gibier management app.
-- Apply manually in Supabase SQL Editor after reviewing table names.

create extension if not exists pgcrypto;

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.facilities enable row level security;
alter table public.profiles enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_facility_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select facility_id
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.prevent_profile_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id or new.facility_id <> old.facility_id then
    raise exception 'user_id and facility_id cannot be changed from profile updates';
  end if;

  return new;
end;
$$;

drop trigger if exists facilities_touch_updated_at on public.facilities;
create trigger facilities_touch_updated_at
before update on public.facilities
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_prevent_scope_change on public.profiles;
create trigger profiles_prevent_scope_change
before update on public.profiles
for each row execute function public.prevent_profile_scope_change();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_facility_id uuid;
begin
  insert into public.facilities (name)
  values (coalesce(new.raw_user_meta_data->>'facility_name', 'ジビエ処理施設'))
  returning id into new_facility_id;

  insert into public.profiles (user_id, facility_id, name, email)
  values (
    new.id,
    new_facility_id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop policy if exists "profiles_select_same_facility" on public.profiles;
create policy "profiles_select_same_facility"
on public.profiles
for select
to authenticated
using (facility_id = public.current_user_facility_id());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and facility_id = public.current_user_facility_id()
);

drop policy if exists "facilities_select_own" on public.facilities;
create policy "facilities_select_own"
on public.facilities
for select
to authenticated
using (id = public.current_user_facility_id());

drop policy if exists "facilities_update_own" on public.facilities;
create policy "facilities_update_own"
on public.facilities
for update
to authenticated
using (id = public.current_user_facility_id())
with check (id = public.current_user_facility_id());

-- Add these columns to each app record table when those tables are created.
-- Replace table names with the actual Supabase table names used for animals,
-- hygiene records, photos, inventory, shipments, and traceability records.
--
-- alter table public.<record_table>
--   add column if not exists facility_id uuid references public.facilities(id) on delete cascade,
--   add column if not exists created_by uuid references auth.users(id),
--   add column if not exists updated_by uuid references auth.users(id);
--
-- create index if not exists <record_table>_facility_id_idx
--   on public.<record_table>(facility_id);
--
-- alter table public.<record_table> enable row level security;
--
-- create policy "<record_table>_same_facility_select"
-- on public.<record_table>
-- for select
-- to authenticated
-- using (facility_id = public.current_user_facility_id());
--
-- create policy "<record_table>_same_facility_insert"
-- on public.<record_table>
-- for insert
-- to authenticated
-- with check (
--   facility_id = public.current_user_facility_id()
--   and created_by = auth.uid()
-- );
--
-- create policy "<record_table>_same_facility_update"
-- on public.<record_table>
-- for update
-- to authenticated
-- using (facility_id = public.current_user_facility_id())
-- with check (
--   facility_id = public.current_user_facility_id()
--   and updated_by = auth.uid()
-- );
--
-- create policy "<record_table>_same_facility_delete"
-- on public.<record_table>
-- for delete
-- to authenticated
-- using (facility_id = public.current_user_facility_id());
