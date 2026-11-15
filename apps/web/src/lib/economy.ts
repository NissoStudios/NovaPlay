import { useSyncExternalStore } from "react";
import { evaluateGameAchievements } from "./achievements";

const STORAGE_KEY = "novaplay:eco-arcade:v1";
const ECONOMY_EVENT = "novaplay:economy-change";
const MULTIPLIERS = [1, 1.25, 1.5, 2] as const;

interface StoredEconomy {
  version: number;
  coins: number;
  multiplierLevel: number;
  pendingMegaBoost?: boolean;
  [key: string]: unknown;
}

function readSnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseEconomy(raw: string): StoredEconomy {
  const fallback: StoredEconomy = {
    version: 1,
    coins: 30,
    multiplierLevel: 0,
    pendingMegaBoost: false,
  };
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return fallback;
    }
    const obj = parsed as Record<string, unknown>;
    return {
      ...obj,
      version: typeof obj.version === "number" ? obj.version : 1,
      coins: typeof obj.coins === "number" && Number.isFinite(obj.coins) ? obj.coins : 30,
      multiplierLevel:
        typeof obj.multiplierLevel === "number" && obj.multiplierLevel >= 0
          ? obj.multiplierLevel
          : 0,
      pendingMegaBoost: Boolean(obj.pendingMegaBoost),
    };
  } catch {
    return fallback;
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ECONOMY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ECONOMY_EVENT, callback);
  };
}

export function getNovaCoins(): number {
  return parseEconomy(readSnapshot()).coins;
}

export function awardNovaCoins(baseAmount: number): number {
  if (typeof window === "undefined" || !Number.isFinite(baseAmount) || baseAmount <= 0) {
    return 0;
  }
  const current = parseEconomy(readSnapshot());
  const mult = MULTIPLIERS[current.multiplierLevel] ?? 1;
  let earned = Math.max(1, Math.round(baseAmount * mult));
  if (current.pendingMegaBoost) {
    earned *= 2;
    current.pendingMegaBoost = false;
  }
  current.coins += earned;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event(ECONOMY_EVENT));
    evaluateGameAchievements({ coins: current.coins });
    return earned;
  } catch {
    return 0;
  }
}

export function useNovaCoins(): number {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => "");
  return parseEconomy(snapshot).coins;
}
