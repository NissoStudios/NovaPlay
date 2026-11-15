import type {
  AdminStats,
  ApiErrorBody,
  Game,
  GameInput,
  LeaderboardEntry,
  PublicGame,
} from "@novaplay/shared";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });

  const contentType = response.headers.get("content-type");
  const body: unknown = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiClientError(
        body.error.message,
        response.status,
        body.error.code,
        body.error.details,
      );
    }
    throw new ApiClientError(
      `La requête a échoué (${response.status}).`,
      response.status,
      "REQUEST_FAILED",
    );
  }

  return body as T;
}

export interface PublicGameFilters {
  search?: string;
  category?: string;
  featured?: boolean;
}

export async function getGames(
  filters: PublicGameFilters = {},
  signal?: AbortSignal,
): Promise<PublicGame[]> {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.category) query.set("category", filters.category);
  if (filters.featured !== undefined) query.set("featured", String(filters.featured));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const response = await apiRequest<{ games: PublicGame[] }>(`/api/games${suffix}`, { signal });
  return response.games;
}

export async function getGame(slug: string, signal?: AbortSignal): Promise<PublicGame> {
  const response = await apiRequest<{ game: PublicGame }>(
    `/api/games/${encodeURIComponent(slug)}`,
    { signal },
  );
  return response.game;
}

export async function recordPlay(slug: string): Promise<number> {
  const response = await apiRequest<{ playCount: number }>(
    `/api/games/${encodeURIComponent(slug)}/play`,
    { method: "POST" },
  );
  return response.playCount;
}

export async function getLeaderboard(
  slug: string,
  order: "asc" | "desc" = "desc",
  signal?: AbortSignal,
): Promise<LeaderboardEntry[]> {
  const response = await apiRequest<{ entries: LeaderboardEntry[] }>(
    `/api/games/${encodeURIComponent(slug)}/leaderboard?order=${order}`,
    { signal },
  );
  return response.entries;
}

export async function submitLeaderboardScore(
  slug: string,
  playerName: string,
  score: number,
  order: "asc" | "desc" = "desc",
): Promise<LeaderboardEntry[]> {
  const response = await apiRequest<{ entries: LeaderboardEntry[] }>(
    `/api/games/${encodeURIComponent(slug)}/scores?order=${order}`,
    {
      method: "POST",
      body: JSON.stringify({ playerName, score }),
    },
  );
  return response.entries;
}

export async function adminLogin(username: string, password: string): Promise<void> {
  await apiRequest("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function adminLogout(): Promise<void> {
  await apiRequest("/api/admin/logout", { method: "POST" });
}

export async function getAdminSession(signal?: AbortSignal): Promise<{ username: string }> {
  const response = await apiRequest<{ admin: { username: string } }>("/api/admin/session", {
    signal,
  });
  return response.admin;
}

export async function getAdminGames(signal?: AbortSignal): Promise<Game[]> {
  const response = await apiRequest<{ games: Game[] }>("/api/admin/games", { signal });
  return response.games;
}

export async function getAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  const response = await apiRequest<{ stats: AdminStats }>("/api/admin/stats", { signal });
  return response.stats;
}

export async function createAdminGame(input: GameInput): Promise<Game> {
  const response = await apiRequest<{ game: Game }>("/api/admin/games", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.game;
}

export async function updateAdminGame(id: number, input: GameInput): Promise<Game> {
  const response = await apiRequest<{ game: Game }>(`/api/admin/games/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.game;
}

export async function deleteAdminGame(id: number): Promise<void> {
  await apiRequest(`/api/admin/games/${id}`, { method: "DELETE" });
}
