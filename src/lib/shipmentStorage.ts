import type { Shipment } from "@/types/gibier";
import { filterByCurrentFacility, mergeScopedRecords, withCreateOwnership } from "@/lib/auth/accessScope";

export const SHIPMENT_STORAGE_KEY = "arcnest-gibier:shipments";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getShipments() {
  return filterByCurrentFacility(readAllShipments());
}

function readAllShipments() {
  if (!canUseStorage()) return [];

  try {
    const rawShipments = window.localStorage.getItem(SHIPMENT_STORAGE_KEY);
    if (!rawShipments) return [];

    const parsedShipments = JSON.parse(rawShipments);
    return Array.isArray(parsedShipments) ? (parsedShipments as Shipment[]) : [];
  } catch {
    return [];
  }
}

export function saveShipments(shipments: Shipment[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SHIPMENT_STORAGE_KEY, JSON.stringify(mergeScopedRecords(readAllShipments(), shipments)));
}

export function addShipment(shipment: Shipment) {
  saveShipments([withCreateOwnership(shipment), ...getShipments()]);
}

export function getShipmentsByAnimalId(animalId: string) {
  return getShipments().filter((shipment) => shipment.animalId === animalId || shipment.animalNumber === animalId);
}

export function deleteShipment(shipmentId: string) {
  saveShipments(getShipments().filter((shipment) => shipment.id !== shipmentId));
}
