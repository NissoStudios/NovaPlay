import { useCallback, useSyncExternalStore } from "react";
import { evaluateGameAchievements } from "./achievements";

const FAVORITES_KEY = "novaplay:favorites";
const RECENT_KEY = "novaplay:recent";
const LOCAL_CHANGE_EVENT = "novaplay:storage-change";

function readSnapshot(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch (error) {
    console.error(`[NovaPlay] Impossible de lire ${key}`, error);
    return "[]";
  }
}

function parseSlugs(snapshot: string): string[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : [];
  } catch (error) {
    console.error("[NovaPlay] Données locales invalides", error);
    return [];
  }
}

function writeSlugs(key: string, slugs: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(slugs));
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
  } catch (error) {
    console.error(`[NovaPlay] Impossible d’enregistrer ${key}`, error);
    throw new Error("L’enregistrement local est indisponible sur ce navigateur.");
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
  };
}

function useSlugStorage(key: string): string[] {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => readSnapshot(key),
    () => "[]",
  );
  return parseSlugs(snapshot);
}

export function useFavorites() {
  const favorites = useSlugStorage(FAVORITES_KEY);
  const toggleFavorite = useCallback((slug: string) => {
    const current = parseSlugs(readSnapshot(FAVORITES_KEY));
    const next = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [slug, ...current];
    writeSlugs(FAVORITES_KEY, next);
    evaluateGameAchievements({ favoriteCount: next.length });
  }, []);

  return { favorites, toggleFavorite };
}

export function useRecentGames(): string[] {
  return useSlugStorage(RECENT_KEY);
}

export function addRecentGame(slug: string): void {
  const current = parseSlugs(readSnapshot(RECENT_KEY)).filter((item) => item !== slug);
  writeSlugs(RECENT_KEY, [slug, ...current].slice(0, 8));
}
