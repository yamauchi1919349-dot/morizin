import type { FacilityHygieneRecord, HealthCheckRecord, WorkHygieneRecord } from "@/types/gibier";

export const FACILITY_HYGIENE_STORAGE_KEY = "arcnest-gibier:facility-hygiene";
export const WORK_HYGIENE_STORAGE_KEY = "arcnest-gibier:work-hygiene";
export const HEALTH_CHECK_STORAGE_KEY = "arcnest-gibier:health-checks";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRecords<T>(key: string): T[] {
  if (!canUseStorage()) return [];

  try {
    const rawRecords = window.localStorage.getItem(key);
    if (!rawRecords) return [];

    const parsedRecords = JSON.parse(rawRecords);
    return Array.isArray(parsedRecords) ? (parsedRecords as T[]) : [];
  } catch {
    return [];
  }
}

function saveRecords<T>(key: string, records: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(records));
}

export function getFacilityHygieneRecords() {
  return readRecords<FacilityHygieneRecord>(FACILITY_HYGIENE_STORAGE_KEY);
}

export function saveFacilityHygieneRecords(records: FacilityHygieneRecord[]) {
  saveRecords(FACILITY_HYGIENE_STORAGE_KEY, records);
}

export function addFacilityHygieneRecord(record: FacilityHygieneRecord) {
  saveFacilityHygieneRecords([record, ...getFacilityHygieneRecords()]);
}

export function getWorkHygieneRecords() {
  return readRecords<WorkHygieneRecord>(WORK_HYGIENE_STORAGE_KEY);
}

export function saveWorkHygieneRecords(records: WorkHygieneRecord[]) {
  saveRecords(WORK_HYGIENE_STORAGE_KEY, records);
}

export function addWorkHygieneRecord(record: WorkHygieneRecord) {
  saveWorkHygieneRecords([record, ...getWorkHygieneRecords()]);
}

export function getHealthCheckRecords() {
  return readRecords<HealthCheckRecord>(HEALTH_CHECK_STORAGE_KEY);
}

export function saveHealthCheckRecords(records: HealthCheckRecord[]) {
  saveRecords(HEALTH_CHECK_STORAGE_KEY, records);
}

export function addHealthCheckRecord(record: HealthCheckRecord) {
  saveHealthCheckRecords([record, ...getHealthCheckRecords()]);
}

export function getHygieneStatusByAnimalId(animalId: string) {
  const workRecords = getWorkHygieneRecords();

  return {
    hasFacilityRecord: getFacilityHygieneRecords().length > 0,
    hasWorkRecord: workRecords.some((record) => record.animalId === animalId || record.animalNumber === animalId),
    hasHealthRecord: getHealthCheckRecords().length > 0,
  };
}
