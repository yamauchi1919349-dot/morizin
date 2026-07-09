export type AccessScope = {
  facilityId: string;
  userId: string;
  name?: string;
  email?: string;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
};

export type OwnershipFields = {
  facility_id?: string;
  created_by?: string;
  updated_by?: string;
  createdByName?: string;
  updatedByName?: string;
};

const accessScopeStorageKey = "arcnest-gibier:access-scope";
const localAccessScope: AccessScope = {
  facilityId: "local-facility",
  userId: "local-user",
  isAuthenticated: false,
  isSupabaseConfigured: false,
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getLocalAccessScope() {
  return localAccessScope;
}

export function getCurrentAccessScope(): AccessScope {
  if (!canUseStorage()) return localAccessScope;

  try {
    const rawScope = window.localStorage.getItem(accessScopeStorageKey);
    if (!rawScope) return localAccessScope;

    const parsedScope = JSON.parse(rawScope) as Partial<AccessScope>;
    if (!parsedScope.facilityId || !parsedScope.userId) return localAccessScope;

    return {
      facilityId: parsedScope.facilityId,
      userId: parsedScope.userId,
      name: parsedScope.name,
      email: parsedScope.email,
      isAuthenticated: Boolean(parsedScope.isAuthenticated),
      isSupabaseConfigured: Boolean(parsedScope.isSupabaseConfigured),
    };
  } catch {
    return localAccessScope;
  }
}

export function getAccessScopeDisplayName(scope = getCurrentAccessScope()) {
  return scope.name || scope.email || (scope.isAuthenticated ? scope.userId : "未ログイン");
}

export function saveCurrentAccessScope(scope: AccessScope) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(accessScopeStorageKey, JSON.stringify(scope));
}

export function clearCurrentAccessScope() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(accessScopeStorageKey);
}

export function belongsToCurrentFacility(record: OwnershipFields, scope = getCurrentAccessScope()) {
  return !record.facility_id || record.facility_id === scope.facilityId;
}

export function filterByCurrentFacility<T extends OwnershipFields>(records: T[], scope = getCurrentAccessScope()) {
  return records.filter((record) => belongsToCurrentFacility(record, scope));
}

export function withCreateOwnership<T extends OwnershipFields>(record: T, scope = getCurrentAccessScope()): T {
  const displayName = getAccessScopeDisplayName(scope);

  return {
    ...record,
    facility_id: record.facility_id ?? scope.facilityId,
    created_by: record.created_by ?? scope.userId,
    updated_by: record.updated_by ?? scope.userId,
    createdByName: record.createdByName ?? displayName,
    updatedByName: record.updatedByName ?? displayName,
  };
}

export function withUpdateOwnership<T extends OwnershipFields>(record: T, scope = getCurrentAccessScope()): T {
  const displayName = getAccessScopeDisplayName(scope);

  return {
    ...record,
    facility_id: record.facility_id ?? scope.facilityId,
    created_by: record.created_by ?? scope.userId,
    updated_by: scope.userId,
    createdByName: record.createdByName ?? displayName,
    updatedByName: displayName,
  };
}

export function mergeScopedRecords<T extends OwnershipFields & { id: string }>(allRecords: T[], nextScopedRecords: T[], scope = getCurrentAccessScope()) {
  const hiddenRecords = allRecords.filter((record) => !belongsToCurrentFacility(record, scope));
  const scopedRecords = nextScopedRecords.map((record) => withUpdateOwnership(record, scope));

  return [...scopedRecords, ...hiddenRecords];
}
