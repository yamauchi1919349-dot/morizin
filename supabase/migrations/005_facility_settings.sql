-- Facility settings columns for Morizin.
-- This migration extends the existing facility row without changing tenant IDs,
-- profiles, staff management objects, RLS policies, or existing triggers.

begin;

alter table public.facilities
  add column postal_code text,
  add column address text,
  add column phone_number text,
  add column manager_name text,
  add column registration_number text,
  add column notes text,
  add column aging_days integer not null default 3,
  add column species jsonb not null default '[{"id":"deer","name":"ニホンジカ"},{"id":"boar","name":"イノシシ"}]'::jsonb,
  add column pdf_settings jsonb not null default '{"facilityName":"","phoneNumber":"","creatorName":""}'::jsonb,
  add column settings_version smallint not null default 0,
  add constraint facilities_aging_days_nonnegative_check
    check (aging_days >= 0),
  add constraint facilities_settings_version_nonnegative_check
    check (settings_version >= 0),
  add constraint facilities_species_array_check
    check (jsonb_typeof(species) = 'array'),
  add constraint facilities_species_nonempty_check
    check (
      case
        when jsonb_typeof(species) = 'array' then jsonb_array_length(species) >= 1
        else true
      end
    ),
  add constraint facilities_pdf_settings_object_check
    check (jsonb_typeof(pdf_settings) = 'object');

comment on column public.facilities.postal_code is 'Facility postal code.';
comment on column public.facilities.address is 'Facility street address.';
comment on column public.facilities.phone_number is 'Facility phone number.';
comment on column public.facilities.manager_name is 'Facility manager name.';
comment on column public.facilities.registration_number is 'Facility registration or certification number.';
comment on column public.facilities.notes is 'Facility notes.';
comment on column public.facilities.aging_days is 'Default aging period in days.';
comment on column public.facilities.species is 'Facility-specific animal species options as a JSON array.';
comment on column public.facilities.pdf_settings is 'Facility-specific PDF display settings as a JSON object.';
comment on column public.facilities.settings_version is 'Facility settings migration version. Zero means not migrated from local storage.';

commit;
