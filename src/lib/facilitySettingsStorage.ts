export type FacilitySettings = {
  agingDays: number;
};

export const facilitySettingsStorageKey = "arcnest-gibier:facility-settings";

export const defaultFacilitySettings: FacilitySettings = {
  agingDays: 3,
};

function normalizeFacilitySettings(value: unknown): FacilitySettings {
  if (!value || typeof value !== "object") return defaultFacilitySettings;

  const settings = value as Partial<FacilitySettings>;
  const agingDays = Number(settings.agingDays);

  return {
    agingDays: Number.isFinite(agingDays) && agingDays >= 0 ? agingDays : defaultFacilitySettings.agingDays,
  };
}

export function getFacilitySettings(): FacilitySettings {
  if (typeof window === "undefined") return defaultFacilitySettings;

  const raw = window.localStorage.getItem(facilitySettingsStorageKey);
  if (!raw) return defaultFacilitySettings;

  try {
    return normalizeFacilitySettings(JSON.parse(raw));
  } catch {
    return defaultFacilitySettings;
  }
}

export function saveFacilitySettings(settings: FacilitySettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(facilitySettingsStorageKey, JSON.stringify(normalizeFacilitySettings(settings)));
}
