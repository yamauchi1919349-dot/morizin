-- Animal records for the gibier management app.
-- Apply manually in Supabase SQL Editor after 001_id_management.sql.

create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  animal_number text not null,
  species text,
  sex text,
  pregnancy_status text,
  horn_status text,
  estimated_age text,
  captured_at timestamptz,
  capture_location text,
  mesh_number text,
  weather text,
  temperature text,
  hunter_name text,
  transport_method text,
  received_at timestamptz,
  received_by text,
  ante_mortem_notes text,
  dressing_notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint animals_facility_animal_number_key unique (facility_id, animal_number)
);

create index if not exists animals_facility_id_idx
  on public.animals(facility_id);

create index if not exists animals_animal_number_idx
  on public.animals(animal_number);

alter table public.animals enable row level security;

drop trigger if exists animals_touch_updated_at on public.animals;
create trigger animals_touch_updated_at
before update on public.animals
for each row execute function public.touch_updated_at();

drop policy if exists "animals_same_facility_select" on public.animals;
create policy "animals_same_facility_select"
on public.animals
for select
to authenticated
using (facility_id = public.current_user_facility_id());

drop policy if exists "animals_same_facility_insert" on public.animals;
create policy "animals_same_facility_insert"
on public.animals
for insert
to authenticated
with check (
  facility_id = public.current_user_facility_id()
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "animals_same_facility_update" on public.animals;
create policy "animals_same_facility_update"
on public.animals
for update
to authenticated
using (facility_id = public.current_user_facility_id())
with check (
  facility_id = public.current_user_facility_id()
  and updated_by = auth.uid()
);

drop policy if exists "animals_same_facility_delete" on public.animals;
create policy "animals_same_facility_delete"
on public.animals
for delete
to authenticated
using (facility_id = public.current_user_facility_id());
