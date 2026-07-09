"use client";

import type { User } from "@supabase/supabase-js";
import { withUpdateOwnership } from "@/lib/auth/accessScope";
import {
  ANIMAL_STORAGE_KEY,
  addAnimal as addLocalAnimal,
  getAnimalById as getLocalAnimalById,
  getAnimals as getLocalAnimals,
  saveAnimals as saveLocalAnimals,
} from "@/lib/animalStorage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Animal } from "@/types/gibier";

type AnimalRow = {
  id: string;
  facility_id: string;
  created_by: string | null;
  updated_by: string | null;
  animal_number: string;
  species: string | null;
  sex: string | null;
  pregnancy_status: string | null;
  horn_status: string | null;
  estimated_age: string | null;
  captured_at: string | null;
  capture_location: string | null;
  mesh_number: string | null;
  weather: string | null;
  temperature: string | null;
  hunter_name: string | null;
  transport_method: string | null;
  received_at: string | null;
  received_by: string | null;
  ante_mortem_notes: string | null;
  dressing_notes: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type SupabaseAnimalContext = {
  user: User;
  facilityId: string;
  displayName: string;
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
};

type ProfileRow = {
  facility_id: string | null;
  name: string | null;
  email: string | null;
};

export type AnimalWriteResult = {
  animal: Animal;
  source: "supabase" | "localStorage";
};

export type AnimalMigrationResult = {
  successCount: number;
  failureCount: number;
  skippedCount: number;
  failureReasons: string[];
};

function normalizeAnimalNumber(animalNumber: string) {
  return animalNumber.trim().toLocaleLowerCase();
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalAnimalsForMigration() {
  if (!canUseStorage()) {
    return { animals: [] as Animal[], failureReason: "ブラウザのlocalStorageを読み取れません。" };
  }

  try {
    const rawAnimals = window.localStorage.getItem(ANIMAL_STORAGE_KEY);
    if (!rawAnimals) return { animals: [] as Animal[] };

    const parsedAnimals = JSON.parse(rawAnimals);
    if (!Array.isArray(parsedAnimals)) {
      return { animals: [] as Animal[], failureReason: "ローカル個体データの形式が正しくありません。" };
    }

    return { animals: parsedAnimals as Animal[] };
  } catch (error) {
    console.error("Local animal migration read failed.", error);
    return { animals: [] as Animal[], failureReason: "ローカル個体データを読み取れませんでした。" };
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toIsoTimestamp(value?: string) {
  if (!value) return null;

  const normalizedValue = value.replaceAll("/", "-").replace(" ", "T");
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatStoredDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

async function getSupabaseAnimalContext(): Promise<SupabaseAnimalContext | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("facility_id,name,email")
    .eq("user_id", data.user.id)
    .maybeSingle<ProfileRow>();

  if (!profile?.facility_id) return null;

  return {
    supabase,
    user: data.user,
    facilityId: profile.facility_id,
    displayName: profile.name ?? profile.email ?? data.user.email ?? data.user.id,
  };
}

function rowToAnimal(row: AnimalRow): Animal {
  const payload = (row.payload ?? {}) as Partial<Animal>;

  return {
    ...payload,
    id: row.id,
    facility_id: row.facility_id,
    created_by: row.created_by ?? undefined,
    updated_by: row.updated_by ?? undefined,
    animalNumber: row.animal_number,
    species: (row.species ?? payload.species ?? "") as Animal["species"],
    sex: (row.sex ?? payload.sex ?? "unknown") as Animal["sex"],
    pregnancyStatus: (row.pregnancy_status ?? payload.pregnancyStatus ?? "") as Animal["pregnancyStatus"],
    antlerStatus: (row.horn_status ?? payload.antlerStatus ?? "") as Animal["antlerStatus"],
    estimatedAge: (row.estimated_age ?? payload.estimatedAge ?? "") as Animal["estimatedAge"],
    weightKg: Number(payload.weightKg ?? 0),
    capturedAt: formatStoredDate(row.captured_at) || payload.capturedAt || "",
    captureLocation: row.capture_location ?? payload.captureLocation ?? "",
    meshNumber: row.mesh_number ?? payload.meshNumber,
    captureMethod: payload.captureMethod ?? "",
    hunterName: row.hunter_name ?? payload.hunterName ?? "",
    weather: row.weather ?? payload.weather,
    temperatureC: row.temperature ?? payload.temperatureC,
    receivedAt: formatStoredDate(row.received_at) || payload.receivedAt || "",
    transportedBy: row.transport_method ?? payload.transportedBy,
    receivedBy: row.received_by ?? payload.receivedBy ?? "",
    stopBleedingBy: payload.stopBleedingBy,
    transportCooling: payload.transportCooling,
    impactOrBleedingPart: payload.impactOrBleedingPart,
    bleedingPerformed: payload.bleedingPerformed,
    knifeSanitationMethod: payload.knifeSanitationMethod,
    bleedingStartTime: payload.bleedingStartTime,
    receivingAbnormalityChecks: payload.receivingAbnormalityChecks,
    processingAbnormalityChecks: payload.processingAbnormalityChecks,
    acceptanceDecision: payload.acceptanceDecision,
    acceptanceRejectionReason: payload.acceptanceRejectionReason,
    status: payload.status ?? "received",
    notes: row.ante_mortem_notes ?? payload.notes ?? "",
    hasIssue: Boolean(payload.hasIssue),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: payload.createdByName,
    updatedByName: payload.updatedByName,
  };
}

function animalToRow(animal: Animal, context: SupabaseAnimalContext) {
  const payload = withUpdateOwnership(
    {
      ...animal,
      facility_id: context.facilityId,
      created_by: animal.created_by ?? context.user.id,
      updated_by: context.user.id,
      createdByName: animal.createdByName ?? context.displayName,
      updatedByName: context.displayName,
    },
    {
      facilityId: context.facilityId,
      userId: context.user.id,
      name: context.displayName,
      email: context.user.email,
      isAuthenticated: true,
      isSupabaseConfigured: true,
    },
  );

  return {
    facility_id: context.facilityId,
    created_by: context.user.id,
    updated_by: context.user.id,
    animal_number: animal.animalNumber,
    species: animal.species || null,
    sex: animal.sex || null,
    pregnancy_status: animal.pregnancyStatus || null,
    horn_status: animal.antlerStatus || null,
    estimated_age: animal.estimatedAge || null,
    captured_at: toIsoTimestamp(animal.capturedAt),
    capture_location: animal.captureLocation || null,
    mesh_number: animal.meshNumber || null,
    weather: animal.weather || null,
    temperature: animal.temperatureC === undefined || animal.temperatureC === null ? null : String(animal.temperatureC),
    hunter_name: animal.hunterName || null,
    transport_method: animal.transportedBy || null,
    received_at: toIsoTimestamp(animal.receivedAt),
    received_by: animal.receivedBy || null,
    ante_mortem_notes: animal.notes || null,
    dressing_notes: animal.acceptanceRejectionReason || null,
    payload,
  };
}

function upsertLocalAnimal(animal: Animal) {
  const nextAnimal = withUpdateOwnership(animal);
  const nextAnimals = [nextAnimal, ...getLocalAnimals().filter((item) => item.id !== nextAnimal.id && item.animalNumber !== nextAnimal.animalNumber)];
  saveLocalAnimals(nextAnimals);
  return nextAnimal;
}

export async function listAnimals(): Promise<Animal[]> {
  const context = await getSupabaseAnimalContext();
  if (!context) return getLocalAnimals();

  const { data, error } = await context.supabase.from("animals").select("*").order("created_at", { ascending: false });
  if (error) {
    console.warn("Supabase animal list failed. Falling back to localStorage.", error);
    return getLocalAnimals();
  }

  return ((data ?? []) as AnimalRow[]).map(rowToAnimal);
}

export async function getAnimalById(id: string): Promise<Animal | undefined> {
  const context = await getSupabaseAnimalContext();
  if (!context) return getLocalAnimalById(id);

  const query = context.supabase.from("animals").select("*");
  const { data, error } = isUuid(id) ? await query.eq("id", id).maybeSingle() : await query.eq("animal_number", id).maybeSingle();

  if (error) {
    console.warn("Supabase animal lookup failed. Falling back to localStorage.", error);
    return getLocalAnimalById(id);
  }

  return data ? rowToAnimal(data as AnimalRow) : undefined;
}

export async function createAnimal(input: Animal): Promise<AnimalWriteResult | null> {
  const context = await getSupabaseAnimalContext();
  if (!context) {
    return addLocalAnimal(input) ? { animal: input, source: "localStorage" } : null;
  }

  const { data, error } = await context.supabase
    .from("animals")
    .insert(animalToRow(input, context))
    .select("*")
    .single();

  if (error) {
    console.warn("Supabase animal create failed. Falling back to localStorage.", error);
    return addLocalAnimal(input) ? { animal: input, source: "localStorage" } : null;
  }

  return { animal: rowToAnimal(data as AnimalRow), source: "supabase" };
}

export async function updateAnimal(id: string, input: Animal): Promise<AnimalWriteResult | null> {
  const context = await getSupabaseAnimalContext();
  if (!context) {
    return { animal: upsertLocalAnimal(input), source: "localStorage" };
  }

  const query = context.supabase.from("animals").update(animalToRow(input, context));
  const { data, error } = isUuid(id) ? await query.eq("id", id).select("*").single() : await query.eq("animal_number", id).select("*").single();

  if (error) {
    console.warn("Supabase animal update failed. Falling back to localStorage.", error);
    return { animal: upsertLocalAnimal(input), source: "localStorage" };
  }

  return { animal: rowToAnimal(data as AnimalRow), source: "supabase" };
}

export async function deleteAnimal(id: string): Promise<boolean> {
  const context = await getSupabaseAnimalContext();
  if (!context) {
    const target = getLocalAnimalById(id);
    if (!target) return false;
    saveLocalAnimals(getLocalAnimals().filter((animal) => animal.id !== target.id && animal.animalNumber !== target.animalNumber));
    return true;
  }

  const query = context.supabase.from("animals").delete();
  const { error } = isUuid(id) ? await query.eq("id", id) : await query.eq("animal_number", id);
  if (error) {
    console.warn("Supabase animal delete failed. Falling back to localStorage.", error);
    const target = getLocalAnimalById(id);
    if (!target) return false;
    saveLocalAnimals(getLocalAnimals().filter((animal) => animal.id !== target.id && animal.animalNumber !== target.animalNumber));
    return true;
  }

  return true;
}

export async function hasDuplicateAnimalNumber(animalNumber: string, excludeAnimalId?: string): Promise<boolean> {
  const normalizedAnimalNumber = normalizeAnimalNumber(animalNumber);
  if (!normalizedAnimalNumber) return false;

  const animals = await listAnimals();
  return animals.some((animal) => {
    if (excludeAnimalId && animal.id === excludeAnimalId) return false;
    return normalizeAnimalNumber(animal.animalNumber) === normalizedAnimalNumber;
  });
}

export async function migrateLocalAnimalsToSupabase(): Promise<AnimalMigrationResult> {
  const context = await getSupabaseAnimalContext();
  const localRead = readLocalAnimalsForMigration();
  const localAnimals = localRead.animals;

  if (!context) {
    return {
      successCount: 0,
      failureCount: localAnimals.length,
      skippedCount: 0,
      failureReasons: [localRead.failureReason ?? "Supabaseにログインしていないため移行できません。"],
    };
  }

  if (localRead.failureReason) {
    return { successCount: 0, failureCount: 1, skippedCount: 0, failureReasons: [localRead.failureReason] };
  }

  if (localAnimals.length === 0) {
    return { successCount: 0, failureCount: 0, skippedCount: 0, failureReasons: [] };
  }

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const failureReasons: string[] = [];

  for (const localAnimal of localAnimals) {
    if (!localAnimal.animalNumber?.trim()) {
      skippedCount += 1;
      continue;
    }

    try {
      const existingAnimal = (await listAnimals()).find((animal) => normalizeAnimalNumber(animal.animalNumber) === normalizeAnimalNumber(localAnimal.animalNumber));
      const result = existingAnimal ? await updateAnimal(existingAnimal.id, { ...existingAnimal, ...localAnimal, id: existingAnimal.id }) : await createAnimal(localAnimal);

      if (result?.source === "supabase") {
        successCount += 1;
      } else {
        failureCount += 1;
        failureReasons.push(`${localAnimal.animalNumber}: Supabaseへ保存できませんでした。`);
      }
    } catch (error) {
      console.error("Local animal migration item failed.", error);
      failureCount += 1;
      failureReasons.push(`${localAnimal.animalNumber}: 移行中にエラーが発生しました。`);
    }
  }

  return { successCount, failureCount, skippedCount, failureReasons };
}
