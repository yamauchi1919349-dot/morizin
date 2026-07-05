import type { AnimalPhoto } from "@/types/gibier";

export const ANIMAL_PHOTO_STORAGE_KEY = "arcnest-gibier:animal-photos";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAnimalPhotos(): AnimalPhoto[] {
  if (!canUseStorage()) return [];

  try {
    const rawPhotos = window.localStorage.getItem(ANIMAL_PHOTO_STORAGE_KEY);
    if (!rawPhotos) return [];

    const parsedPhotos = JSON.parse(rawPhotos);
    return Array.isArray(parsedPhotos) ? (parsedPhotos as AnimalPhoto[]) : [];
  } catch {
    return [];
  }
}

export function getAnimalPhotosByAnimalId(animalId: string) {
  return getAnimalPhotos().filter((photo) => photo.animalId === animalId);
}

export function saveAnimalPhotos(photos: AnimalPhoto[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ANIMAL_PHOTO_STORAGE_KEY, JSON.stringify(photos));
}

export function upsertAnimalPhoto(photo: AnimalPhoto) {
  const photos = getAnimalPhotos();
  const nextPhotos = [photo, ...photos.filter((item) => item.id !== photo.id && !(item.animalId === photo.animalId && item.type === photo.type))];
  saveAnimalPhotos(nextPhotos);
}

export function deleteAnimalPhoto(photoId: string) {
  saveAnimalPhotos(getAnimalPhotos().filter((photo) => photo.id !== photoId));
}
