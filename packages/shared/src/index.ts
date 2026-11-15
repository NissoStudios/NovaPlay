export const GAME_CATEGORIES = [
  "Arcade",
  "Puzzle",
  "Réflexion",
  "Adresse",
  "Stratégie",
  "Mémoire",
] as const;

export const GAME_DIFFICULTIES = ["Facile", "Intermédiaire", "Difficile"] as const;

export const INTERNAL_GAME_IDS = [
  "neon-snake",
  "merge-2048",
  "astro-dodge",
  "brick-blast",
  "memory-flip",
  "morpion-solo",
  "puissance-quatre",
  "pulse-tap",
  "simon-orbit",
  "crystal-mines",
  "eco-arcade-hub",
  "eco-arcade-hub-3d",
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];
export type GameDifficulty = (typeof GAME_DIFFICULTIES)[number];
export type InternalGameId = (typeof INTERNAL_GAME_IDS)[number];
export type GameSourceType = "internal" | "embed";
export type GameStatus = "draft" | "published";

export interface GameInput {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: GameCategory;
  tags: string[];
  sourceType: GameSourceType;
  internalGameId: InternalGameId | null;
  embedUrl: string | null;
  accentColor: string;
  secondaryColor: string;
  icon: string;
  difficulty: GameDifficulty;
  status: GameStatus;
  featured: boolean;
  sortOrder: number;
}

export interface Game extends GameInput {
  id: number;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PublicGame = Omit<Game, "status" | "sortOrder">;

export interface AdminStats {
  totalGames: number;
  publishedGames: number;
  draftGames: number;
  totalPlays: number;
  featuredGames: number;
}

export interface LeaderboardEntry {
  id: number;
  gameSlug: string;
  playerName: string;
  score: number;
  createdAt: string;
}

export interface ScoreSubmissionInput {
  playerName: string;
  score: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
