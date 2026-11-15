import { useCallback, useSyncExternalStore } from "react";
import { evaluateGameAchievements } from "./achievements";

const BEST_SCORES_KEY = "novaplay:best-scores:v1";
const SCORE_EVENT = "novaplay:best-score-change";

export type ScoreDirection = "high" | "low";

function readStoreSnapshot(): string {
  if (typeof window === "undefined") return "{}";
  try {
    return window.localStorage.getItem(BEST_SCORES_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function parseScores(snapshot: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const clean: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "number" && Number.isFinite(val)) {
        clean[key] = val;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function subscribeScores(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === BEST_SCORES_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SCORE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SCORE_EVENT, callback);
  };
}

export function getBestScore(gameId: string): number | null {
  const scores = parseScores(readStoreSnapshot());
  return scores[gameId] ?? null;
}

export function recordBestScore(
  gameId: string,
  value: number,
  direction: ScoreDirection = "high",
): boolean {
  if (typeof window === "undefined" || !Number.isFinite(value)) return false;
  if (direction === "high" && value <= 0) return false;
  evaluateGameAchievements({ gameId, score: value });
  const scores = parseScores(readStoreSnapshot());
  const current = scores[gameId];
  const isBetter =
    current === undefined ||
    (direction === "high" ? value > current : value < current);
  if (!isBetter) return false;
  try {
    scores[gameId] = value;
    window.localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(scores));
    window.dispatchEvent(new Event(SCORE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function useBestScore(
  gameId: string,
  direction: ScoreDirection = "high",
): { best: number | null; submitScore: (value: number) => boolean } {
  const snapshot = useSyncExternalStore(subscribeScores, readStoreSnapshot, () => "{}");
  const scores = parseScores(snapshot);
  const best = scores[gameId] ?? null;
  const submitScore = useCallback(
    (value: number) => recordBestScore(gameId, value, direction),
    [gameId, direction],
  );
  return { best, submitScore };
}
