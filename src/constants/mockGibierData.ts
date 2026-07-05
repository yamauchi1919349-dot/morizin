import type {
  Animal,
  AnimalPhoto,
  DashboardSummary,
  HygieneRecordSummary,
  InventoryItem,
  PdfExportHistory,
  Shipment,
} from "@/types/gibier";

export const mockAnimals: Animal[] = [];

export const mockAnimalPhotos: AnimalPhoto[] = [];

export const mockInventoryItems: InventoryItem[] = [];

export const mockShipments: Shipment[] = [];

export const mockHygieneSummary: HygieneRecordSummary = {
  date: "",
  facilityInspectionCompleted: false,
  workHygieneCompleted: false,
  healthCheckCompleted: false,
  hasIssue: false,
};

export const mockPdfExportHistory: PdfExportHistory[] = [];

export const mockDashboardSummary: DashboardSummary = {
  todayReceived: 0,
  waitingProcessing: 0,
  waitingShipment: 0,
  needsReview: 0,
};
