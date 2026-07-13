-- Isolate the legacy staff invitation flow without deleting application data.
-- Apply only after the legacy staff mutation routes have been placed in maintenance mode.

begin;

do $preflight$
declare
  unexpected_overloads text;
begin
  if exists (
    select 1
    from public.facilities facility
    where exists (
      select 1
      from public.profiles profile
      where profile.facility_id = facility.id
    )
      and not exists (
        select 1
        from public.profiles owner_profile
        where owner_profile.facility_id = facility.id
          and owner_profile.role = 'owner'
          and owner_profile.status = 'active'
      )
  ) then
    raise exception '005 isolation aborted: at least one facility with profiles has no active Owner';
  end if;

  if to_regclass('public.staff_invitations') is null then
    raise exception '005 isolation aborted: public.staff_invitations does not exist';
  end if;

  if to_regclass('public.staff_invitations_004_archive') is not null then
    raise exception '005 isolation aborted: public.staff_invitations_004_archive already exists';
  end if;

  if to_regprocedure('public.attach_invited_staff(uuid,uuid,uuid)') is null
    or to_regprocedure('public.create_staff_invitation(uuid,text,text)') is null
    or to_regprocedure('public.complete_staff_invitation(uuid)') is null
    or to_regprocedure('public.update_staff_profile(uuid,uuid,text,text,text)') is null then
    raise exception '005 isolation aborted: one or more expected legacy staff functions are missing';
  end if;

  select string_agg(
    format('%I.%I(%s)', namespace_row.nspname, function_row.proname, oidvectortypes(function_row.proargtypes)),
    ', ' order by function_row.proname, oidvectortypes(function_row.proargtypes)
  )
  into unexpected_overloads
  from pg_catalog.pg_proc function_row
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = function_row.pronamespace
  where namespace_row.nspname = 'public'
    and function_row.proname in (
      'attach_invited_staff',
      'create_staff_invitation',
      'complete_staff_invitation',
      'update_staff_profile'
    )
    and not (
      (function_row.proname = 'attach_invited_staff'
        and oidvectortypes(function_row.proargtypes) = 'uuid, uuid, uuid')
      or (function_row.proname = 'create_staff_invitation'
        and oidvectortypes(function_row.proargtypes) = 'uuid, text, text')
      or (function_row.proname = 'complete_staff_invitation'
        and oidvectortypes(function_row.proargtypes) = 'uuid')
      or (function_row.proname = 'update_staff_profile'
        and oidvectortypes(function_row.proargtypes) = 'uuid, uuid, text, text, text')
    );

  if unexpected_overloads is not null then
    raise exception '005 isolation aborted: unexpected legacy function overloads require manual review: %', unexpected_overloads;
  end if;
end
$preflight$;

drop trigger if exists staff_invitations_touch_updated_at on public.staff_invitations;

drop function public.attach_invited_staff(uuid, uuid, uuid);
drop function public.create_staff_invitation(uuid, text, text);
drop function public.complete_staff_invitation(uuid);
drop function public.update_staff_profile(uuid, uuid, text, text, text);

alter table public.staff_invitations
  rename to staff_invitations_004_archive;

alter table public.staff_invitations_004_archive enable row level security;

revoke all on table public.staff_invitations_004_archive from public;
revoke all on table public.staff_invitations_004_archive from anon;
revoke all on table public.staff_invitations_004_archive from authenticated;
revoke all on table public.staff_invitations_004_archive from service_role;
grant select on table public.staff_invitations_004_archive to service_role;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_facility_id uuid;
begin
  if new.invited_at is not null then
    return new;
  end if;

  insert into public.facilities (name)
  values (
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'facility_name'), ''),
      'ジビエ処理施設'
    )
  )
  returning id into new_facility_id;

  insert into public.profiles (
    user_id,
    facility_id,
    name,
    email,
    role,
    status,
    invited_at,
    activated_at,
    disabled_at
  )
  values (
    new.id,
    new_facility_id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), new.email),
    new.email,
    'owner',
    'active',
    null,
    now(),
    null
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public;
revoke all on function public.handle_new_user_profile() from anon;
revoke all on function public.handle_new_user_profile() from authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

do $verification$
declare
  matching_auth_trigger_count integer;
  archive_rls_enabled boolean;
begin
  if to_regclass('public.staff_invitations') is not null then
    raise exception '005 verification failed: public.staff_invitations still exists';
  end if;

  if to_regclass('public.staff_invitations_004_archive') is null then
    raise exception '005 verification failed: archive table does not exist';
  end if;

  if to_regprocedure('public.attach_invited_staff(uuid,uuid,uuid)') is not null
    or to_regprocedure('public.create_staff_invitation(uuid,text,text)') is not null
    or to_regprocedure('public.complete_staff_invitation(uuid)') is not null
    or to_regprocedure('public.update_staff_profile(uuid,uuid,text,text,text)') is not null then
    raise exception '005 verification failed: a legacy staff function still exists';
  end if;

  if to_regprocedure('public.handle_new_user_profile()') is null then
    raise exception '005 verification failed: public.handle_new_user_profile() does not exist';
  end if;

  select count(*)
  into matching_auth_trigger_count
  from pg_catalog.pg_trigger trigger_row
  join pg_catalog.pg_proc function_row
    on function_row.oid = trigger_row.tgfoid
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = function_row.pronamespace
  where trigger_row.tgrelid = 'auth.users'::regclass
    and trigger_row.tgname = 'on_auth_user_created_profile'
    and not trigger_row.tgisinternal
    and namespace_row.nspname = 'public'
    and function_row.proname = 'handle_new_user_profile';

  if matching_auth_trigger_count <> 1 then
    raise exception '005 verification failed: expected exactly one auth profile trigger, found %', matching_auth_trigger_count;
  end if;

  select class_row.relrowsecurity
  into archive_rls_enabled
  from pg_catalog.pg_class class_row
  where class_row.oid = 'public.staff_invitations_004_archive'::regclass;

  if archive_rls_enabled is distinct from true then
    raise exception '005 verification failed: archive table RLS is not enabled';
  end if;

  if exists (
    select 1
    from (
      values
        ('anon'::text, 'SELECT'::text, false),
        ('anon', 'INSERT', false),
        ('anon', 'UPDATE', false),
        ('anon', 'DELETE', false),
        ('anon', 'TRUNCATE', false),
        ('anon', 'REFERENCES', false),
        ('anon', 'TRIGGER', false),
        ('authenticated', 'SELECT', false),
        ('authenticated', 'INSERT', false),
        ('authenticated', 'UPDATE', false),
        ('authenticated', 'DELETE', false),
        ('authenticated', 'TRUNCATE', false),
        ('authenticated', 'REFERENCES', false),
        ('authenticated', 'TRIGGER', false),
        ('service_role', 'SELECT', true),
        ('service_role', 'INSERT', false),
        ('service_role', 'UPDATE', false),
        ('service_role', 'DELETE', false),
        ('service_role', 'TRUNCATE', false),
        ('service_role', 'REFERENCES', false),
        ('service_role', 'TRIGGER', false)
    ) as expected_table_privilege(role_name, privilege_name, should_have_privilege)
    where has_table_privilege(
      expected_table_privilege.role_name,
      'public.staff_invitations_004_archive',
      expected_table_privilege.privilege_name
    ) is distinct from expected_table_privilege.should_have_privilege
  ) then
    raise exception '005 verification failed: archive table privileges do not match the expected role permissions';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute attribute_row
    cross join (
      values
        ('anon'::text, 'SELECT'::text),
        ('anon', 'INSERT'),
        ('anon', 'UPDATE'),
        ('anon', 'REFERENCES'),
        ('authenticated', 'SELECT'),
        ('authenticated', 'INSERT'),
        ('authenticated', 'UPDATE'),
        ('authenticated', 'REFERENCES'),
        ('service_role', 'INSERT'),
        ('service_role', 'UPDATE'),
        ('service_role', 'REFERENCES')
    ) as denied_column_privilege(role_name, privilege_name)
    where attribute_row.attrelid = 'public.staff_invitations_004_archive'::regclass
      and attribute_row.attnum > 0
      and not attribute_row.attisdropped
      and has_column_privilege(
        denied_column_privilege.role_name,
        attribute_row.attrelid,
        attribute_row.attnum,
        denied_column_privilege.privilege_name
      )
  ) then
    raise exception '005 verification failed: an unexpected archive column privilege exists';
  end if;

  if exists (
    select 1
    from public.facilities facility
    where exists (
      select 1
      from public.profiles profile
      where profile.facility_id = facility.id
    )
      and not exists (
        select 1
        from public.profiles owner_profile
        where owner_profile.facility_id = facility.id
          and owner_profile.role = 'owner'
          and owner_profile.status = 'active'
      )
  ) then
    raise exception '005 verification failed: at least one facility with profiles has no active Owner';
  end if;
end
$verification$;

select
  to_regclass('public.staff_invitations') is null as legacy_table_isolated,
  to_regclass('public.staff_invitations_004_archive') is not null as archive_exists,
  to_regprocedure('public.handle_new_user_profile()') is not null as signup_trigger_function_exists;

commit;
