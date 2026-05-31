import type { SavedCar } from "../types";

export const STORAGE_KEY = "heloc.savedCars.v1";

export function loadSavedCars(): SavedCar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(cars: SavedCar[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
}

export function saveCar(car: SavedCar): SavedCar[] {
  const cars = loadSavedCars().filter((c) => c.id !== car.id);
  cars.push(car);
  persist(cars);
  return cars;
}

export function removeCar(id: string): SavedCar[] {
  const cars = loadSavedCars().filter((c) => c.id !== id);
  persist(cars);
  return cars;
}
