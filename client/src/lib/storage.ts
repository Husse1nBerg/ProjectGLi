import type { ResaleEstimate, SavedCar, Source } from "../types";
import { calculateHeloc } from "./heloc";
import { readSnapshot, type ScenarioSnapshot } from "./scenarios";

export const STORAGE_KEY = "heloc.savedCars.v1";
export const DRAFT_KEY = "heloc.draft.v1";

function webUrl(value: unknown): value is string {
  try { return typeof value === "string" && ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function restoreEstimate(value: unknown): ResaleEstimate | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as ResaleEstimate;
  if (![raw.conservativeResale, raw.realisticResale, raw.strongResale].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ||
      typeof raw.explanation !== "string" || !Array.isArray(raw.sources)) return null;
  const sources: Source[] = raw.sources.flatMap((source) => {
    if (!source || typeof source !== "object" || !webUrl(source.url) || typeof source.title !== "string") return [];
    const text = (v: unknown) => typeof v === "string" ? v : null;
    const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
    return [{ url: source.url, title: source.title, vehicle: text(source.vehicle), location: text(source.location),
      matchNotes: text(source.matchNotes), priceCAD: number(source.priceCAD), mileageKm: number(source.mileageKm),
      provenance: source.provenance === "provider-citation" || source.provenance === "model-link" ? source.provenance : undefined }];
  });
  return { conservativeResale: raw.conservativeResale, realisticResale: raw.realisticResale, strongResale: raw.strongResale,
    explanation: raw.explanation, sources, searchedAt: typeof raw.searchedAt === "string" ? raw.searchedAt : undefined };
}

export function loadDraft(): ScenarioSnapshot | null {
  try { return readSnapshot(JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"), true); }
  catch { return null; }
}

export function saveDraft(draft: ScenarioSnapshot): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadSavedCars(): SavedCar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((car) => {
      const snapshot = readSnapshot(car);
      if (!snapshot || typeof car.id !== "string" || typeof car.label !== "string") return [];
      return [{ id: car.id, label: car.label, ...snapshot, result: calculateHeloc(snapshot.input, snapshot.resaleValue),
        estimate: restoreEstimate(car.estimate), excludedUrls: Array.isArray(car.excludedUrls) ? car.excludedUrls.filter(webUrl) : [],
        estimateInputKey: typeof car.estimateInputKey === "string" ? car.estimateInputKey : "",
        savedAt: typeof car.savedAt === "string" ? car.savedAt : undefined }];
    });
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
