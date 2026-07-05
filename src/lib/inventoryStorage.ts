import type { InventoryItem } from "@/types/gibier";

export const INVENTORY_STORAGE_KEY = "arcnest-gibier:inventory-items";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getInventoryItems() {
  if (!canUseStorage()) return [];

  try {
    const rawItems = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!rawItems) return [];

    const parsedItems = JSON.parse(rawItems);
    return Array.isArray(parsedItems) ? (parsedItems as InventoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveInventoryItems(items: InventoryItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
}

export function addInventoryItem(item: InventoryItem) {
  saveInventoryItems([item, ...getInventoryItems()]);
}

export function getInventoryItemsByAnimalId(animalId: string) {
  return getInventoryItems().filter((item) => item.animalId === animalId || item.animalNumber === animalId);
}

export function deleteInventoryItem(itemId: string) {
  saveInventoryItems(getInventoryItems().filter((item) => item.id !== itemId));
}
