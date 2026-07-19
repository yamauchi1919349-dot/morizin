"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  FacilitySettingsApiResponse,
  FacilitySettingsDto,
  FacilitySettingsFacility,
  FacilitySettingsPdf,
  FacilitySettingsSpecies,
} from "@/types/facilitySettings";

export class FacilitySettingsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function parseFacility(value: unknown): FacilitySettingsFacility | null {
  if (!isObject(value)) return null;
  const name = stringValue(value.name);
  const postalCode = stringValue(value.postalCode);
  const address = stringValue(value.address);
  const phoneNumber = stringValue(value.phoneNumber);
  const managerName = stringValue(value.managerName);
  const registrationNumber = stringValue(value.registrationNumber);
  const notes = stringValue(value.notes);
  if (name === null || postalCode === null || address === null || phoneNumber === null
    || managerName === null || registrationNumber === null || notes === null) return null;
  return { name, postalCode, address, phoneNumber, managerName, registrationNumber, notes };
}

function parseSpecies(value: unknown): FacilitySettingsSpecies[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return null;
  const species: FacilitySettingsSpecies[] = [];
  const seenIds = new Set<string>();
  for (const item of value) {
    if (!isObject(item)) return null;
    const id = stringValue(item.id)?.trim() ?? null;
    const name = stringValue(item.name)?.trim() ?? null;
    if (id === null || name === null || !id || !name
      || id.length > 100 || name.length > 100 || seenIds.has(id)) return null;
    seenIds.add(id);
    species.push({ id, name });
  }
  return species;
}

function parsePdf(value: unknown): FacilitySettingsPdf | null {
  if (!isObject(value)) return null;
  const facilityName = stringValue(value.facilityName);
  const phoneNumber = stringValue(value.phoneNumber);
  const creatorName = stringValue(value.creatorName);
  if (facilityName === null || phoneNumber === null || creatorName === null) return null;
  return { facilityName, phoneNumber, creatorName };
}

function parseSettings(value: unknown): FacilitySettingsDto | null {
  if (!isObject(value)) return null;
  const facility = parseFacility(value.facility);
  const species = parseSpecies(value.species);
  const pdf = parsePdf(value.pdf);
  if (!facility || !species || !pdf || typeof value.agingDays !== "number"
    || !Number.isInteger(value.agingDays) || value.agingDays < 0 || value.agingDays > 365) return null;
  return { facility, agingDays: value.agingDays, species, pdf };
}

function parseResponse(value: unknown): FacilitySettingsApiResponse | null {
  if (!isObject(value)) return null;
  const settings = parseSettings(value.settings);
  if (!settings || typeof value.settingsVersion !== "number"
    || !Number.isInteger(value.settingsVersion) || value.settingsVersion < 0
    || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return null;
  return { settings, settingsVersion: value.settingsVersion, updatedAt: value.updatedAt };
}

function statusMessage(status: number) {
  if (status === 401) return "ログイン状態を確認できませんでした。再度ログインしてください。";
  if (status === 403) return "施設設定を閲覧する権限がありません。";
  if (status === 404) return "施設情報が見つかりません。";
  if (status === 503) return "施設設定のサーバー設定が完了していません。";
  return "施設設定を取得できませんでした。";
}

export async function getFacilitySettingsFromApi(signal?: AbortSignal): Promise<FacilitySettingsApiResponse> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new FacilitySettingsApiError(503, "クラウド連携が設定されていません。");

  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) throw new FacilitySettingsApiError(401, statusMessage(401));

  const response = await fetch("/api/facility-settings", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal,
  });
  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new FacilitySettingsApiError(response.status, statusMessage(response.status));

  const parsed = parseResponse(responseBody);
  if (!parsed) throw new FacilitySettingsApiError(500, "施設設定の応答形式が正しくありません。");
  return parsed;
}
