export type FacilitySettingsSpecies = {
  id: string;
  name: string;
};

export type FacilitySettingsFacility = {
  name: string;
  postalCode: string;
  address: string;
  phoneNumber: string;
  managerName: string;
  registrationNumber: string;
  notes: string;
};

export type FacilitySettingsPdf = {
  facilityName: string;
  phoneNumber: string;
  creatorName: string;
};

export type FacilitySettingsDto = {
  facility: FacilitySettingsFacility;
  agingDays: number;
  species: FacilitySettingsSpecies[];
  pdf: FacilitySettingsPdf;
};

export type FacilitySettingsApiResponse = {
  settings: FacilitySettingsDto;
  settingsVersion: number;
  updatedAt: string;
};
