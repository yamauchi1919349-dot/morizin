import { getCurrentAccessScope } from "@/lib/auth/accessScope";

export type FacilityAnimalSpecies = {
  id: string;
  name: string;
};

export type FacilityStaffRole = "owner" | "staff";

export type FacilityStaffMember = {
  id: string;
  name: string;
  email: string;
  role: FacilityStaffRole;
  inviteCode: string;
  createdAt: string;
};

export type FacilityProfile = {
  name: string;
  postalCode: string;
  address: string;
  phoneNumber: string;
  managerName: string;
  registrationNumber: string;
  notes: string;
};

export type PdfSettings = {
  facilityName: string;
  phoneNumber: string;
  creatorName: string;
};

export type FacilitySettings = {
  agingDays: number;
  facility: FacilityProfile;
  staff: FacilityStaffMember[];
  species: FacilityAnimalSpecies[];
  pdf: PdfSettings;
};

export const facilitySettingsStorageKey = "arcnest-gibier:facility-settings";

export const defaultSpecies: FacilityAnimalSpecies[] = [
  { id: "deer", name: "ニホンジカ" },
  { id: "boar", name: "イノシシ" },
];

const defaultFacilityProfile: FacilityProfile = {
  name: "",
  postalCode: "",
  address: "",
  phoneNumber: "",
  managerName: "",
  registrationNumber: "",
  notes: "",
};

const defaultPdfSettings: PdfSettings = {
  facilityName: "",
  phoneNumber: "",
  creatorName: "",
};

export const defaultFacilitySettings: FacilitySettings = {
  agingDays: 3,
  facility: defaultFacilityProfile,
  staff: [],
  species: defaultSpecies,
  pdf: defaultPdfSettings,
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSpecies(value: unknown): FacilityAnimalSpecies[] {
  if (!Array.isArray(value)) return defaultSpecies;

  const species = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<FacilityAnimalSpecies>;
      const id = text(candidate.id).trim();
      const name = text(candidate.name).trim();
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((item): item is FacilityAnimalSpecies => item !== null);

  return species.length > 0 ? species : defaultSpecies;
}

function normalizeStaff(value: unknown): FacilityStaffMember[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<FacilityStaffMember>;
      const id = text(candidate.id).trim();
      const name = text(candidate.name).trim();
      const email = text(candidate.email).trim();
      const role = candidate.role === "owner" ? "owner" : "staff";
      const inviteCode = text(candidate.inviteCode).trim();
      const createdAt = text(candidate.createdAt).trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        email,
        role,
        inviteCode: inviteCode || `INV-${id}`,
        createdAt: createdAt || new Date().toISOString(),
      };
    })
    .filter((item): item is FacilityStaffMember => item !== null);
}

function normalizeFacilitySettings(value: unknown): FacilitySettings {
  if (!value || typeof value !== "object") return defaultFacilitySettings;

  const settings = value as Partial<FacilitySettings>;
  const facility = settings.facility ?? {};
  const pdf = settings.pdf ?? {};
  const agingDays = Number(settings.agingDays);

  return {
    agingDays: Number.isFinite(agingDays) && agingDays >= 0 ? agingDays : defaultFacilitySettings.agingDays,
    facility: {
      name: text((facility as Partial<FacilityProfile>).name),
      postalCode: text((facility as Partial<FacilityProfile>).postalCode),
      address: text((facility as Partial<FacilityProfile>).address),
      phoneNumber: text((facility as Partial<FacilityProfile>).phoneNumber),
      managerName: text((facility as Partial<FacilityProfile>).managerName),
      registrationNumber: text((facility as Partial<FacilityProfile>).registrationNumber),
      notes: text((facility as Partial<FacilityProfile>).notes),
    },
    staff: normalizeStaff(settings.staff),
    species: normalizeSpecies(settings.species),
    pdf: {
      facilityName: text((pdf as Partial<PdfSettings>).facilityName),
      phoneNumber: text((pdf as Partial<PdfSettings>).phoneNumber),
      creatorName: text((pdf as Partial<PdfSettings>).creatorName),
    },
  };
}

function getScopedFacilitySettingsStorageKey() {
  return `${facilitySettingsStorageKey}:${getCurrentAccessScope().facilityId}`;
}

export function getFacilitySettings(): FacilitySettings {
  if (typeof window === "undefined") return defaultFacilitySettings;

  const raw = window.localStorage.getItem(getScopedFacilitySettingsStorageKey()) ?? window.localStorage.getItem(facilitySettingsStorageKey);
  if (!raw) return defaultFacilitySettings;

  try {
    return normalizeFacilitySettings(JSON.parse(raw));
  } catch {
    return defaultFacilitySettings;
  }
}

export function getScopedFacilitySettings(facilityId: string): FacilitySettings | null {
  if (typeof window === "undefined" || !facilityId) return null;
  const raw = window.localStorage.getItem(`${facilitySettingsStorageKey}:${facilityId}`);
  if (!raw) return null;

  try {
    return normalizeFacilitySettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasUnscopedFacilitySettings() {
  return typeof window !== "undefined" && window.localStorage.getItem(facilitySettingsStorageKey) !== null;
}

export function saveFacilitySettings(settings: FacilitySettings) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getScopedFacilitySettingsStorageKey(), JSON.stringify(normalizeFacilitySettings(settings)));
}

export function getSpeciesOptions() {
  return getFacilitySettings().species;
}

export function getSpeciesName(speciesId: string) {
  return getFacilitySettings().species.find((species) => species.id === speciesId)?.name ?? speciesId;
}

export function createInviteCode(email: string) {
  const seed = `${email || "staff"}-${Date.now()}`;
  return `INV-${btoa(unescape(encodeURIComponent(seed))).replace(/[^A-Z0-9]/gi, "").slice(0, 10).toUpperCase()}`;
}
