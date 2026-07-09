import type { Animal } from "@/types/gibier";
import { filterByCurrentFacility, mergeScopedRecords, withCreateOwnership } from "@/lib/auth/accessScope";

export const ANIMAL_STORAGE_KEY = "arcnest-gibier:animals";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAnimals(): Animal[] {
  return filterByCurrentFacility(readAllAnimals());
}

function readAllAnimals(): Animal[] {
  if (!canUseStorage()) return [];

  try {
    const rawAnimals = window.localStorage.getItem(ANIMAL_STORAGE_KEY);
    if (!rawAnimals) return [];

    const parsedAnimals = JSON.parse(rawAnimals);
    return Array.isArray(parsedAnimals) ? (parsedAnimals as Animal[]) : [];
  } catch {
    return [];
  }
}

export function saveAnimals(animals: Animal[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ANIMAL_STORAGE_KEY, JSON.stringify(mergeScopedRecords(readAllAnimals(), animals)));
}

function normalizeAnimalNumber(animalNumber: string) {
  return animalNumber.trim().toLocaleLowerCase();
}

export function hasDuplicateAnimalNumber(animalNumber: string, excludeAnimalId?: string) {
  const normalizedAnimalNumber = normalizeAnimalNumber(animalNumber);
  if (!normalizedAnimalNumber) return false;

  return getAnimals().some((animal) => {
    if (excludeAnimalId && animal.id === excludeAnimalId) return false;
    return normalizeAnimalNumber(animal.animalNumber) === normalizedAnimalNumber;
  });
}

export function addAnimal(animal: Animal) {
  if (hasDuplicateAnimalNumber(animal.animalNumber, animal.id)) return false;

  const animals = getAnimals();
  saveAnimals([withCreateOwnership(animal), ...animals]);
  return true;
}

export function getAnimalById(id: string) {
  return getAnimals().find((animal) => animal.id === id || animal.animalNumber === id);
}
