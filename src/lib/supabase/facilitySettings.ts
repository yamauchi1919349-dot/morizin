import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { StaffApiError } from "@/lib/supabase/server";
import type { FacilitySettingsApiResponse, FacilitySettingsDto, FacilitySettingsPdf, FacilitySettingsSpecies } from "@/types/facilitySettings";

type FacilitySettingsRow = {
  id: string;
  name: string;
  postal_code: string | null;
  address: string | null;
  phone_number: string | null;
  manager_name: string | null;
  registration_number: string | null;
  notes: string | null;
  aging_days: number;
  species: unknown;
  pdf_settings: unknown;
  settings_version: number;
  updated_at: string;
};

const facilitySelect = "id,name,postal_code,address,phone_number,manager_name,registration_number,notes,aging_days,species,pdf_settings,settings_version,updated_at";
const defaultSpecies: FacilitySettingsSpecies[] = [
  { id: "deer", name: "ニホンジカ" },
  { id: "boar", name: "イノシシ" },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length
    && actualKeys.every((key) => keys.includes(key))
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function requiredObject(value: unknown, keys: readonly string[], label: string) {
  if (!isPlainObject(value) || !hasExactKeys(value, keys)) {
    throw new StaffApiError(400, `${label}の形式が正しくありません。`);
  }
  return value;
}

function validatedText(value: unknown, label: string, maxLength: number, allowEmpty = true) {
  if (typeof value !== "string") throw new StaffApiError(400, `${label}は文字列で入力してください。`);
  const normalized = value.trim();
  if ((!allowEmpty && !normalized) || normalized.length > maxLength) {
    throw new StaffApiError(400, `${label}の入力内容が正しくありません。`);
  }
  return normalized;
}

function nullableText(value: string) {
  return value || null;
}

function normalizeDatabaseText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeDatabaseSpecies(value: unknown): FacilitySettingsSpecies[] {
  if (!Array.isArray(value)) return defaultSpecies.map((item) => ({ ...item }));

  const seenIds = new Set<string>();
  const normalized: FacilitySettingsSpecies[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const id = normalizeDatabaseText(item.id).trim();
    const name = normalizeDatabaseText(item.name).trim();
    if (!id || !name || seenIds.has(id)) continue;
    seenIds.add(id);
    normalized.push({ id, name });
  }

  return normalized.length > 0 ? normalized : defaultSpecies.map((item) => ({ ...item }));
}

function normalizeDatabasePdf(value: unknown): FacilitySettingsPdf {
  const pdf = isPlainObject(value) ? value : {};
  return {
    facilityName: normalizeDatabaseText(pdf.facilityName).trim(),
    phoneNumber: normalizeDatabaseText(pdf.phoneNumber).trim(),
    creatorName: normalizeDatabaseText(pdf.creatorName).trim(),
  };
}

function rowToResponse(row: FacilitySettingsRow): FacilitySettingsApiResponse {
  return {
    settings: {
      facility: {
        name: normalizeDatabaseText(row.name),
        postalCode: normalizeDatabaseText(row.postal_code),
        address: normalizeDatabaseText(row.address),
        phoneNumber: normalizeDatabaseText(row.phone_number),
        managerName: normalizeDatabaseText(row.manager_name),
        registrationNumber: normalizeDatabaseText(row.registration_number),
        notes: normalizeDatabaseText(row.notes),
      },
      agingDays: Number.isInteger(row.aging_days) && row.aging_days >= 0 ? row.aging_days : 3,
      species: normalizeDatabaseSpecies(row.species),
      pdf: normalizeDatabasePdf(row.pdf_settings),
    },
    settingsVersion: Number.isInteger(row.settings_version) && row.settings_version >= 0 ? row.settings_version : 0,
    updatedAt: row.updated_at,
  };
}

export function validateFacilitySettingsBody(body: Record<string, unknown>): FacilitySettingsDto {
  if (!hasExactKeys(body, ["settings"])) {
    throw new StaffApiError(400, "リクエストに不要な項目が含まれています。");
  }

  const settings = requiredObject(body.settings, ["facility", "agingDays", "species", "pdf"], "settings");
  const facility = requiredObject(
    settings.facility,
    ["name", "postalCode", "address", "phoneNumber", "managerName", "registrationNumber", "notes"],
    "facility",
  );
  const pdf = requiredObject(settings.pdf, ["facilityName", "phoneNumber", "creatorName"], "pdf");

  if (typeof settings.agingDays !== "number"
    || !Number.isFinite(settings.agingDays)
    || !Number.isInteger(settings.agingDays)
    || settings.agingDays < 0
    || settings.agingDays > 365) {
    throw new StaffApiError(400, "熟成期間は0日から365日までの整数で入力してください。");
  }

  if (!Array.isArray(settings.species) || settings.species.length < 1 || settings.species.length > 30) {
    throw new StaffApiError(400, "動物種は1件から30件まで登録できます。");
  }

  const seenIds = new Set<string>();
  const species = settings.species.map((item, index) => {
    const speciesItem = requiredObject(item, ["id", "name"], `species[${index}]`);
    const id = validatedText(speciesItem.id, `species[${index}].id`, 100, false);
    const name = validatedText(speciesItem.name, `species[${index}].name`, 100, false);
    if (seenIds.has(id)) throw new StaffApiError(400, "動物種のIDが重複しています。");
    seenIds.add(id);
    return { id, name };
  });

  return {
    facility: {
      name: validatedText(facility.name, "施設名", 200, false),
      postalCode: validatedText(facility.postalCode, "郵便番号", 20),
      address: validatedText(facility.address, "住所", 500),
      phoneNumber: validatedText(facility.phoneNumber, "電話番号", 50),
      managerName: validatedText(facility.managerName, "施設責任者", 200),
      registrationNumber: validatedText(facility.registrationNumber, "登録番号・認証番号", 200),
      notes: validatedText(facility.notes, "備考", 2000),
    },
    agingDays: settings.agingDays,
    species,
    pdf: {
      facilityName: validatedText(pdf.facilityName, "PDF表示用施設名", 200),
      phoneNumber: validatedText(pdf.phoneNumber, "PDF表示用電話番号", 200),
      creatorName: validatedText(pdf.creatorName, "作成者名の初期値", 200),
    },
  };
}

export async function getFacilitySettingsForFacility(admin: SupabaseClient, facilityId: string) {
  const { data, error } = await admin
    .from("facilities")
    .select(facilitySelect)
    .eq("id", facilityId)
    .maybeSingle<FacilitySettingsRow>();

  if (error) throw new StaffApiError(500, "施設設定を取得できませんでした。");
  if (!data) throw new StaffApiError(404, "施設情報が見つかりません。");
  return rowToResponse(data);
}

export async function updateFacilitySettingsForFacility(admin: SupabaseClient, facilityId: string, settings: FacilitySettingsDto) {
  const { data, error } = await admin
    .from("facilities")
    .update({
      name: settings.facility.name,
      postal_code: nullableText(settings.facility.postalCode),
      address: nullableText(settings.facility.address),
      phone_number: nullableText(settings.facility.phoneNumber),
      manager_name: nullableText(settings.facility.managerName),
      registration_number: nullableText(settings.facility.registrationNumber),
      notes: nullableText(settings.facility.notes),
      aging_days: settings.agingDays,
      species: settings.species.map(({ id, name }) => ({ id, name })),
      pdf_settings: {
        facilityName: settings.pdf.facilityName,
        phoneNumber: settings.pdf.phoneNumber,
        creatorName: settings.pdf.creatorName,
      },
      settings_version: 1,
    })
    .eq("id", facilityId)
    .select(facilitySelect)
    .maybeSingle<FacilitySettingsRow>();

  if (error) throw new StaffApiError(500, "施設設定を保存できませんでした。");
  if (!data) throw new StaffApiError(404, "施設情報が見つかりません。");
  return rowToResponse(data);
}
