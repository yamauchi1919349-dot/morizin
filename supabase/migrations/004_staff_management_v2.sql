-- Safe staff management v2 for Morizin.
-- Apply manually after 001_id_management.sql, 002_animals.sql, and 003_announcements.sql.
-- This migration intentionally does not modify or remove legacy
-- public.staff_invitations or public.staff_invitations_004_archive objects.

begin;

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists status text;

-- A database created from 001 has one initial owner profile per facility.
-- Do not automatically promote ambiguous multi-profile facilities.
update public.profiles as profile
set role = 'owner'
where profile.role is null
  and (
    select count(*)
    from public.profiles as sibling
    where sibling.facility_id = profile.facility_id
  ) = 1;

update public.profiles
set status = 'active'
where status is null;

do $$
begin
  if exists (
    select 1 from public.profiles
    where role is null or role not in ('owner', 'staff')
  ) then
    raise exception 'staff v2 migration aborted: map every existing profile to owner or staff before retrying';
  end if;

  if exists (
    select 1 from public.profiles
    where status is null or status not in ('active', 'disabled')
  ) then
    raise exception 'staff v2 migration aborted: review legacy profile statuses before retrying';
  end if;

  if exists (
    select 1
    from public.facilities as facility
    where exists (
      select 1 from public.profiles as profile
      where profile.facility_id = facility.id
    )
      and not exists (
        select 1 from public.profiles as owner_profile
        where owner_profile.facility_id = facility.id
          and owner_profile.role = 'owner'
          and owner_profile.status = 'active'
      )
  ) then
    raise exception 'staff v2 migration aborted: every populated facility needs an active owner';
  end if;
end;
$$;

alter table public.profiles alter column role set default 'staff';
alter table public.profiles alter column role set not null;
alter table public.profiles alter column status set default 'active';
alter table public.profiles alter column status set not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'staff'));

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'disabled'));

create index if not exists profiles_facility_role_status_idx
  on public.profiles (facility_id, role, status);

create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create table if not exists public.staff_invitations_v2 (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete restrict,
  email text not null,
  display_name text not null,
  role text not null default 'staff',
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete restrict,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_invitations_v2_email_normalized_check
    check (email = lower(btrim(email)) and length(email) > 3),
  constraint staff_invitations_v2_display_name_check
    check (length(btrim(display_name)) > 0),
  constraint staff_invitations_v2_role_check
    check (role = 'staff'),
  constraint staff_invitations_v2_status_check
    check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  constraint staff_invitations_v2_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint staff_invitations_v2_accepted_check
    check ((status = 'accepted') = (accepted_at is not null))
);

create unique index if not exists staff_invitations_v2_token_hash_key
  on public.staff_invitations_v2 (token_hash);

-- Prevent duplicate pending invitations within the same facility. Cross-facility
-- safety is enforced again when the authenticated email accepts a token.
create unique index if not exists staff_invitations_v2_pending_email_key
  on public.staff_invitations_v2 (facility_id, lower(email))
  where status = 'pending';

create index if not exists staff_invitations_v2_facility_status_idx
  on public.staff_invitations_v2 (facility_id, status, created_at desc);

alter table public.staff_invitations_v2 enable row level security;

drop trigger if exists staff_invitations_v2_touch_updated_at on public.staff_invitations_v2;
create trigger staff_invitations_v2_touch_updated_at
before update on public.staff_invitations_v2
for each row execute function public.touch_updated_at();

create or replace function public.current_user_facility_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select profile.facility_id
  from public.profiles as profile
  where profile.user_id = auth.uid()
    and profile.status = 'active'
  limit 1
$$;

create or replace function public.current_user_is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.user_id = auth.uid()
      and profile.role = 'owner'
      and profile.status = 'active'
  )
$$;

revoke all on function public.current_user_facility_id() from public;
revoke all on function public.current_user_is_owner() from public;
grant execute on function public.current_user_facility_id() to authenticated, service_role;
grant execute on function public.current_user_is_owner() to authenticated, service_role;

create or replace function public.prevent_profile_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
    and (
      new.user_id is distinct from old.user_id
      or new.facility_id is distinct from old.facility_id
      or new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.email is distinct from old.email
    ) then
    raise exception 'protected profile fields cannot be changed from the client';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_scope_change on public.profiles;
create trigger profiles_prevent_scope_change
before update on public.profiles
for each row execute function public.prevent_profile_scope_change();

-- New ordinary sign-ups keep the original owner bootstrap behavior. If an
-- unexpired v2 invitation exists for the email, no facility and no profile are
-- created here. Acceptance creates the staff profile from the invitation only.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_facility_id uuid;
  normalized_email text := lower(btrim(coalesce(new.email, '')));
begin
  if normalized_email <> '' and exists (
    select 1
    from public.staff_invitations_v2 as invitation
    where invitation.email = normalized_email
      and invitation.role = 'staff'
      and invitation.status = 'pending'
      and invitation.expires_at > now()
  ) then
    return new;
  end if;

  insert into public.facilities (name)
  values (coalesce(nullif(btrim(new.raw_user_meta_data->>'facility_name'), ''), 'ジビエ処理施設'))
  returning id into new_facility_id;

  insert into public.profiles (user_id, facility_id, name, email, role, status)
  values (
    new.id,
    new_facility_id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), new.email),
    normalized_email,
    'owner',
    'active'
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.create_staff_invitation_v2(
  p_actor_user_id uuid,
  p_email text,
  p_display_name text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns public.staff_invitations_v2
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile public.profiles%rowtype;
  invitation_row public.staff_invitations_v2%rowtype;
  normalized_email text := lower(btrim(p_email));
begin
  select * into actor_profile
  from public.profiles
  where user_id = p_actor_user_id
  for update;

  if not found or actor_profile.role <> 'owner' or actor_profile.status <> 'active' then
    raise exception 'active owner profile required';
  end if;

  if normalized_email = '' or btrim(p_display_name) = '' then
    raise exception 'email and display name are required';
  end if;

  if p_expires_at <= now() then
    raise exception 'invitation expiry must be in the future';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid invitation token hash';
  end if;

  update public.staff_invitations_v2
  set status = 'expired'
  where status = 'pending'
    and facility_id = actor_profile.facility_id
    and expires_at <= now();

  if exists (
    select 1 from public.profiles
    where lower(email) = normalized_email
  ) then
    raise exception 'email already belongs to a profile';
  end if;

  if exists (
    select 1 from public.staff_invitations_v2
    where facility_id = actor_profile.facility_id
      and email = normalized_email
      and status = 'pending'
  ) then
    raise exception 'pending invitation already exists';
  end if;

  insert into public.staff_invitations_v2 (
    facility_id,
    email,
    display_name,
    role,
    status,
    invited_by,
    token_hash,
    expires_at
  )
  values (
    actor_profile.facility_id,
    normalized_email,
    btrim(p_display_name),
    'staff',
    'pending',
    actor_profile.user_id,
    p_token_hash,
    p_expires_at
  )
  returning * into invitation_row;

  return invitation_row;
end;
$$;

create or replace function public.accept_staff_invitation_v2(
  p_user_id uuid,
  p_token_hash text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation_row public.staff_invitations_v2%rowtype;
  profile_row public.profiles%rowtype;
  auth_email text;
begin
  select * into invitation_row
  from public.staff_invitations_v2
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invitation not found';
  end if;

  if invitation_row.status <> 'pending' then
    raise exception 'invitation is no longer pending';
  end if;

  if invitation_row.expires_at <= now() then
    raise exception 'invitation has expired';
  end if;

  select lower(btrim(email)) into auth_email
  from auth.users
  where id = p_user_id;

  if auth_email is null or auth_email <> invitation_row.email then
    raise exception 'authenticated email does not match invitation';
  end if;

  if invitation_row.invited_user_id is not null
    and invitation_row.invited_user_id <> p_user_id then
    raise exception 'invitation is attached to another user';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(email) = invitation_row.email
      and user_id <> p_user_id
  ) then
    raise exception 'email already belongs to another profile';
  end if;

  select * into profile_row
  from public.profiles
  where user_id = p_user_id
  for update;

  if found then
    if profile_row.facility_id <> invitation_row.facility_id
      or profile_row.role <> 'staff' then
      raise exception 'existing profile cannot be reassigned';
    end if;

    update public.profiles
    set
      name = invitation_row.display_name,
      email = invitation_row.email,
      role = 'staff',
      status = 'active'
    where id = profile_row.id
    returning * into profile_row;
  else
    insert into public.profiles (user_id, facility_id, name, email, role, status)
    values (
      p_user_id,
      invitation_row.facility_id,
      invitation_row.display_name,
      invitation_row.email,
      'staff',
      'active'
    )
    returning * into profile_row;
  end if;

  update public.staff_invitations_v2
  set
    status = 'accepted',
    invited_user_id = p_user_id,
    accepted_at = now()
  where id = invitation_row.id;

  return profile_row;
end;
$$;

create or replace function public.update_staff_profile_v2(
  p_actor_user_id uuid,
  p_target_profile_id uuid,
  p_display_name text,
  p_disable boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
begin
  select * into actor_profile
  from public.profiles
  where user_id = p_actor_user_id
  for update;

  if not found or actor_profile.role <> 'owner' or actor_profile.status <> 'active' then
    raise exception 'active owner profile required';
  end if;

  select * into target_profile
  from public.profiles
  where id = p_target_profile_id
    and facility_id = actor_profile.facility_id
  for update;

  if not found or target_profile.role <> 'staff' then
    raise exception 'staff profile in this facility not found';
  end if;

  if target_profile.user_id = p_actor_user_id then
    raise exception 'owner cannot modify self through staff management';
  end if;

  if not p_disable and btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'display name is required';
  end if;

  update public.profiles
  set
    name = case when p_disable then name else btrim(p_display_name) end,
    status = case when p_disable then 'disabled' else status end
  where id = target_profile.id
  returning * into target_profile;

  return target_profile;
end;
$$;

create or replace function public.cancel_staff_invitation_v2(
  p_actor_user_id uuid,
  p_invitation_id uuid
)
returns public.staff_invitations_v2
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile public.profiles%rowtype;
  invitation_row public.staff_invitations_v2%rowtype;
begin
  select * into actor_profile
  from public.profiles
  where user_id = p_actor_user_id
  for update;

  if not found or actor_profile.role <> 'owner' or actor_profile.status <> 'active' then
    raise exception 'active owner profile required';
  end if;

  update public.staff_invitations_v2
  set status = 'cancelled'
  where id = p_invitation_id
    and facility_id = actor_profile.facility_id
    and status = 'pending'
  returning * into invitation_row;

  if not found then
    raise exception 'pending invitation in this facility not found';
  end if;

  return invitation_row;
end;
$$;

revoke all on function public.create_staff_invitation_v2(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.accept_staff_invitation_v2(uuid, text) from public, anon, authenticated;
revoke all on function public.update_staff_profile_v2(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.cancel_staff_invitation_v2(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_staff_invitation_v2(uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.accept_staff_invitation_v2(uuid, text) to service_role;
grant execute on function public.update_staff_profile_v2(uuid, uuid, text, boolean) to service_role;
grant execute on function public.cancel_staff_invitation_v2(uuid, uuid) to service_role;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_same_facility" on public.profiles;
drop policy if exists "profiles_select_owner_facility_or_self" on public.profiles;
create policy "profiles_select_owner_facility_or_self"
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.current_user_is_owner()
    and facility_id = public.current_user_facility_id()
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (user_id = auth.uid() and status = 'active')
with check (
  user_id = auth.uid()
  and facility_id = public.current_user_facility_id()
  and status = 'active'
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
using (id = public.current_user_facility_id() and public.current_user_is_owner())
with check (id = public.current_user_facility_id() and public.current_user_is_owner());

drop policy if exists "staff_invitations_v2_owner_select" on public.staff_invitations_v2;
create policy "staff_invitations_v2_owner_select"
on public.staff_invitations_v2
for select
to authenticated
using (
  public.current_user_is_owner()
  and facility_id = public.current_user_facility_id()
);

-- Invitation creation, acceptance, cancellation, and staff updates intentionally
-- have no authenticated mutation policies. They run only through the server-side
-- service-role functions above, which repeat owner and facility checks.
revoke all on table public.staff_invitations_v2 from public, anon, authenticated;
grant select on table public.staff_invitations_v2 to authenticated;
grant select, insert, update on table public.staff_invitations_v2 to service_role;

commit;
