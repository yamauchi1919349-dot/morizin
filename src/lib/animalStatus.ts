import type { Animal } from "@/types/gibier";

type AnimalStatusSource = Pick<Animal, "status">;

export function getAnimalStatusLabel(animal: AnimalStatusSource) {
  return animal.status === "processed" ? "精肉済" : "受入済";
}

export function getAnimalStatusBadgeClass(animal: AnimalStatusSource, options?: { interactive?: boolean }) {
  const toneClass =
    animal.status === "processed"
      ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
  const interactionClass = options?.interactive ? "cursor-pointer transition hover:-translate-y-0.5 active:translate-y-0" : "";

  return `inline-flex min-h-9 items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm ${toneClass} ${interactionClass}`;
}
