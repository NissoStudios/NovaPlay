import { useSyncExternalStore } from "react";

const ACHIEVEMENTS_KEY = "novaplay:achievements:v1";
const ACHIEVEMENT_EVENT = "novaplay:achievements-change";

export interface AchievementDef {
  id: string;
  icon: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-launch",
    icon: "🚀",
    titleFr: "Premier décollage",
    titleEn: "First Launch",
    descFr: "Lance ton tout premier jeu sur NovaPlay.",
    descEn: "Launch your very first game on NovaPlay.",
  },
  {
    id: "explorer-5",
    icon: "🧭",
    titleFr: "Explorateur galactique",
    titleEn: "Galaxy Explorer",
    descFr: "Essaie au moins 5 jeux différents.",
    descEn: "Play at least 5 different games.",
  },
  {
    id: "collector-3",
    icon: "💜",
    titleFr: "Collectionneur",
    titleEn: "Collector",
    descFr: "Ajoute 3 jeux à tes favoris.",
    descEn: "Add 3 games to your favorites.",
  },
  {
    id: "rich-100",
    icon: "🪙",
    titleFr: "Chasseur de Nova Coins",
    titleEn: "Coin Hunter",
    descFr: "Atteins 100 Nova Coins dans ton portefeuille partagé.",
    descEn: "Reach 100 Nova Coins in your shared wallet.",
  },
  {
    id: "snake-100",
    icon: "🐍",
    titleFr: "Serpent lumineux",
    titleEn: "Neon Serpent",
    descFr: "Marque 100 points dans Neon Serpent.",
    descEn: "Score 100 points in Neon Serpent.",
  },
  {
    id: "merge-512",
    icon: "✨",
    titleFr: "Maître de la fusion",
    titleEn: "Merge Master",
    descFr: "Atteins 1 000 points dans Fusion 2048.",
    descEn: "Reach 1,000 points in Fusion 2048.",
  },
  {
    id: "mines-clear",
    icon: "💎",
    titleFr: "Démineur expert",
    titleEn: "Crystal Clear",
    descFr: "Sécurise une grille complète de Mines de Cristal.",
    descEn: "Clear an entire Crystal Mines board.",
  },
  {
    id: "simon-5",
    icon: "🌀",
    titleFr: "Mémoire orbitale",
    titleEn: "Orbital Memory",
    descFr: "Réussis une séquence de niveau 5 dans Simon Orbital.",
    descEn: "Clear sequence level 5 in Simon Orbital.",
  },
];

interface AchievementStore {
  unlocked: Record<string, string>;
  playedSlugs: string[];
}

function readRaw(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(ACHIEVEMENTS_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseStore(raw: string): AchievementStore {
  const fallback: AchievementStore = { unlocked: {}, playedSlugs: [] };
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return fallback;
    }
    const obj = parsed as Record<string, unknown>;
    const unlocked: Record<string, string> = {};
    if (typeof obj.unlocked === "object" && obj.unlocked !== null && !Array.isArray(obj.unlocked)) {
      for (const [k, v] of Object.entries(obj.unlocked)) {
        if (typeof v === "string") unlocked[k] = v;
      }
    }
    const playedSlugs = Array.isArray(obj.playedSlugs)
      ? obj.playedSlugs.filter((s): s is string => typeof s === "string")
      : [];
    return { unlocked, playedSlugs };
  } catch {
    return fallback;
  }
}

function writeStore(store: AchievementStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(ACHIEVEMENT_EVENT));
  } catch {
    // Ignore storage errors
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACHIEVEMENTS_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ACHIEVEMENT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ACHIEVEMENT_EVENT, callback);
  };
}

export function unlockAchievement(id: string): boolean {
  if (typeof window === "undefined") return false;
  const store = parseStore(readRaw());
  if (store.unlocked[id]) return false;
  store.unlocked[id] = new Date().toISOString();
  writeStore(store);
  return true;
}

export function evaluateGameAchievements(params: {
  playedSlug?: string;
  favoriteCount?: number;
  coins?: number;
  gameId?: string;
  score?: number;
}): void {
  if (typeof window === "undefined") return;
  const store = parseStore(readRaw());
  let changed = false;

  if (params.playedSlug && !store.playedSlugs.includes(params.playedSlug)) {
    store.playedSlugs.push(params.playedSlug);
    changed = true;
  }
  const grant = (id: string) => {
    if (!store.unlocked[id]) {
      store.unlocked[id] = new Date().toISOString();
      changed = true;
    }
  };

  if (store.playedSlugs.length >= 1) grant("first-launch");
  if (store.playedSlugs.length >= 5) grant("explorer-5");
  if ((params.favoriteCount ?? 0) >= 3) grant("collector-3");
  if ((params.coins ?? 0) >= 100) grant("rich-100");
  if (params.gameId === "neon-snake" && (params.score ?? 0) >= 100) grant("snake-100");
  if (params.gameId === "merge-2048" && (params.score ?? 0) >= 1000) grant("merge-512");
  if (params.gameId === "crystal-mines" && (params.score ?? 0) >= 0) grant("mines-clear");
  if (params.gameId === "simon-orbit" && (params.score ?? 0) >= 5) grant("simon-5");

  if (changed) writeStore(store);
}

export function useAchievements(): {
  unlocked: Record<string, string>;
  unlockedCount: number;
  totalCount: number;
} {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const store = parseStore(raw);
  return {
    unlocked: store.unlocked,
    unlockedCount: Object.keys(store.unlocked).length,
    totalCount: ACHIEVEMENTS.length,
  };
}
