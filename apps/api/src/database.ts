import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import type { AdminStats, Game, GameInput, LeaderboardEntry, PublicGame } from "@novaplay/shared";
import { seedGames } from "./seed.js";

type SqlRow = Record<string, SQLOutputValue>;

function requireString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Colonne SQLite invalide: ${key}`);
  }
  return value;
}

function requireNumber(row: SqlRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new Error(`Colonne SQLite invalide: ${key}`);
  }
  return value;
}

function nullableString(row: SqlRow, key: string): string | null {
  const value = row[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Colonne SQLite invalide: ${key}`);
  }
  return value;
}

function parseTags(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Le champ tags_json de SQLite est invalide.");
  }
  return parsed;
}

function mapGame(row: SqlRow): Game {
  return {
    id: requireNumber(row, "id"),
    slug: requireString(row, "slug"),
    title: requireString(row, "title"),
    shortDescription: requireString(row, "short_description"),
    description: requireString(row, "description"),
    category: requireString(row, "category") as Game["category"],
    tags: parseTags(requireString(row, "tags_json")),
    sourceType: requireString(row, "source_type") as Game["sourceType"],
    internalGameId: nullableString(row, "internal_game_id") as Game["internalGameId"],
    embedUrl: nullableString(row, "embed_url"),
    accentColor: requireString(row, "accent_color"),
    secondaryColor: requireString(row, "secondary_color"),
    icon: requireString(row, "icon"),
    difficulty: requireString(row, "difficulty") as Game["difficulty"],
    status: requireString(row, "status") as Game["status"],
    featured: requireNumber(row, "featured") === 1,
    sortOrder: requireNumber(row, "sort_order"),
    playCount: requireNumber(row, "play_count"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function asRows(value: unknown[]): SqlRow[] {
  return value.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new Error("Résultat SQLite invalide.");
    }
    return row as SqlRow;
  });
}

function toPublicGame(game: Game): PublicGame {
  return {
    id: game.id,
    slug: game.slug,
    title: game.title,
    shortDescription: game.shortDescription,
    description: game.description,
    category: game.category,
    tags: game.tags,
    sourceType: game.sourceType,
    internalGameId: game.internalGameId,
    embedUrl: game.embedUrl,
    accentColor: game.accentColor,
    secondaryColor: game.secondaryColor,
    icon: game.icon,
    difficulty: game.difficulty,
    featured: game.featured,
    playCount: game.playCount,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

export interface GameFilters {
  search?: string;
  category?: string;
  featured?: boolean;
}

export class NovaPlayDatabase {
  private readonly database: DatabaseSync;

  constructor(filePath: string) {
    if (filePath !== ":memory:") {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    this.database = new DatabaseSync(filePath);
    this.database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.migrate();
    this.seed();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        source_type TEXT NOT NULL CHECK (source_type IN ('internal', 'embed')),
        internal_game_id TEXT,
        embed_url TEXT,
        accent_color TEXT NOT NULL,
        secondary_color TEXT NOT NULL,
        icon TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
        featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
        sort_order INTEGER NOT NULL DEFAULT 0,
        play_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (
          (source_type = 'internal' AND internal_game_id IS NOT NULL AND embed_url IS NULL)
          OR
          (source_type = 'embed' AND embed_url IS NOT NULL AND internal_game_id IS NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_games_public
        ON games(status, sort_order, title);
      CREATE INDEX IF NOT EXISTS idx_games_category
        ON games(category, status);

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_slug TEXT NOT NULL,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 0),
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_scores_game
        ON scores(game_slug, score DESC, created_at ASC);
    `);
  }

  private seed(): void {
    const seedMarker = this.database
      .prepare("SELECT value FROM app_meta WHERE key = 'initial_seed'")
      .get();

    if (!seedMarker) {
      const result = this.database.prepare("SELECT COUNT(*) AS count FROM games").get();
      if (!result || typeof result.count !== "number") {
        throw new Error("Impossible de lire le nombre de jeux.");
      }

      if (result.count > 0) {
        this.database
          .prepare("INSERT INTO app_meta (key, value) VALUES ('initial_seed', ?)")
          .run(new Date().toISOString());
      } else {
        this.database.exec("BEGIN");
        try {
          for (const game of seedGames) {
            this.insertGame(game);
          }
          this.database
            .prepare("INSERT INTO app_meta (key, value) VALUES ('initial_seed', ?)")
            .run(new Date().toISOString());
          this.database.exec("COMMIT");
        } catch (error) {
          this.database.exec("ROLLBACK");
          throw error;
        }
      }
    }

    this.applyCatalogMigrations();
    this.applyCatalogMigration3D();
  }

  private applyCatalogMigrations(): void {
    const migrationKey = "catalog_eco_arcade_hub_v1";
    const applied = this.database
      .prepare("SELECT value FROM app_meta WHERE key = ?")
      .get(migrationKey);
    if (applied) {
      return;
    }

    const hubGame = seedGames.find((game) => game.slug === "eco-arcade-hub");
    if (!hubGame) {
      throw new Error("La fiche initiale Eco Arcade Hub est introuvable.");
    }

    this.database.exec("BEGIN");
    try {
      if (!this.getGameBySlug(hubGame.slug)) {
        this.insertGame(hubGame);
      }
      this.database
        .prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)")
        .run(migrationKey, new Date().toISOString());
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  private applyCatalogMigration3D(): void {
    const migrationKey = "catalog_eco_arcade_hub_3d_v1";
    const applied = this.database
      .prepare("SELECT value FROM app_meta WHERE key = ?")
      .get(migrationKey);
    if (applied) {
      return;
    }

    const hubGame = seedGames.find((game) => game.slug === "eco-arcade-hub-3d");
    if (!hubGame) {
      throw new Error("La fiche initiale Eco Arcade Hub 3D est introuvable.");
    }

    this.database.exec("BEGIN");
    try {
      if (!this.getGameBySlug(hubGame.slug)) {
        this.insertGame(hubGame);
      }
      this.database
        .prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)")
        .run(migrationKey, new Date().toISOString());
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  private insertGame(input: GameInput): Game {
    const now = new Date().toISOString();
    const result = this.database
      .prepare(`
        INSERT INTO games (
          slug, title, short_description, description, category, tags_json,
          source_type, internal_game_id, embed_url, accent_color, secondary_color,
          icon, difficulty, status, featured, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.slug,
        input.title,
        input.shortDescription,
        input.description,
        input.category,
        JSON.stringify(input.tags),
        input.sourceType,
        input.internalGameId,
        input.embedUrl,
        input.accentColor,
        input.secondaryColor,
        input.icon,
        input.difficulty,
        input.status,
        input.featured ? 1 : 0,
        input.sortOrder,
        now,
        now,
      );

    const created = this.getGameById(Number(result.lastInsertRowid));
    if (!created) {
      throw new Error("Le jeu créé est introuvable.");
    }
    return created;
  }

  listPublicGames(filters: GameFilters = {}): PublicGame[] {
    const conditions = ["status = 'published'"];
    const parameters: Array<string | number> = [];

    if (filters.search) {
      conditions.push(
        "(LOWER(title) LIKE LOWER(?) OR LOWER(short_description) LIKE LOWER(?) OR LOWER(tags_json) LIKE LOWER(?))",
      );
      const term = `%${filters.search}%`;
      parameters.push(term, term, term);
    }
    if (filters.category) {
      conditions.push("category = ?");
      parameters.push(filters.category);
    }
    if (filters.featured !== undefined) {
      conditions.push("featured = ?");
      parameters.push(filters.featured ? 1 : 0);
    }

    const rows = this.database
      .prepare(`
        SELECT * FROM games
        WHERE ${conditions.join(" AND ")}
        ORDER BY featured DESC, sort_order ASC, title ASC
      `)
      .all(...parameters);

    return asRows(rows).map(mapGame).map(toPublicGame);
  }

  listAdminGames(): Game[] {
    const rows = this.database
      .prepare("SELECT * FROM games ORDER BY sort_order ASC, title ASC")
      .all();
    return asRows(rows).map(mapGame);
  }

  getPublicGameBySlug(slug: string): PublicGame | null {
    const row = this.database
      .prepare("SELECT * FROM games WHERE slug = ? AND status = 'published'")
      .get(slug);
    return row ? toPublicGame(mapGame(row)) : null;
  }

  getGameBySlug(slug: string): Game | null {
    const row = this.database.prepare("SELECT * FROM games WHERE slug = ?").get(slug);
    return row ? mapGame(row) : null;
  }

  getGameById(id: number): Game | null {
    const row = this.database.prepare("SELECT * FROM games WHERE id = ?").get(id);
    return row ? mapGame(row) : null;
  }

  createGame(input: GameInput): Game {
    return this.insertGame(input);
  }

  updateGame(id: number, input: GameInput): Game | null {
    const existing = this.getGameById(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    this.database
      .prepare(`
        UPDATE games SET
          slug = ?, title = ?, short_description = ?, description = ?,
          category = ?, tags_json = ?, source_type = ?, internal_game_id = ?,
          embed_url = ?, accent_color = ?, secondary_color = ?, icon = ?,
          difficulty = ?, status = ?, featured = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        input.slug,
        input.title,
        input.shortDescription,
        input.description,
        input.category,
        JSON.stringify(input.tags),
        input.sourceType,
        input.internalGameId,
        input.embedUrl,
        input.accentColor,
        input.secondaryColor,
        input.icon,
        input.difficulty,
        input.status,
        input.featured ? 1 : 0,
        input.sortOrder,
        now,
        id,
      );

    return this.getGameById(id);
  }

  deleteGame(id: number): boolean {
    return this.database.prepare("DELETE FROM games WHERE id = ?").run(id).changes > 0;
  }

  incrementPlayCount(slug: string): PublicGame | null {
    const result = this.database
      .prepare(`
        UPDATE games
        SET play_count = play_count + 1, updated_at = ?
        WHERE slug = ? AND status = 'published'
      `)
      .run(new Date().toISOString(), slug);

    if (result.changes === 0) {
      return null;
    }
    return this.getPublicGameBySlug(slug);
  }

  getStats(): AdminStats {
    const row = this.database
      .prepare(`
        SELECT
          COUNT(*) AS total_games,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_games,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_games,
          COALESCE(SUM(play_count), 0) AS total_plays,
          SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) AS featured_games
        FROM games
      `)
      .get();

    if (!row) {
      throw new Error("Impossible de calculer les statistiques.");
    }

    return {
      totalGames: requireNumber(row, "total_games"),
      publishedGames: requireNumber(row, "published_games"),
      draftGames: requireNumber(row, "draft_games"),
      totalPlays: requireNumber(row, "total_plays"),
      featuredGames: requireNumber(row, "featured_games"),
    };
  }

  listLeaderboard(slug: string, order: "asc" | "desc" = "desc", limit = 10): LeaderboardEntry[] {
    const direction = order === "asc" ? "ASC" : "DESC";
    const rows = this.database
      .prepare(`
        SELECT id, game_slug, player_name, score, created_at
        FROM scores
        WHERE game_slug = ?
        ORDER BY score ${direction}, created_at ASC
        LIMIT ?
      `)
      .all(slug, limit);

    return asRows(rows).map((row) => ({
      id: requireNumber(row, "id"),
      gameSlug: requireString(row, "game_slug"),
      playerName: requireString(row, "player_name"),
      score: requireNumber(row, "score"),
      createdAt: requireString(row, "created_at"),
    }));
  }

  submitScore(slug: string, playerName: string, score: number): LeaderboardEntry {
    const now = new Date().toISOString();
    const result = this.database
      .prepare(`
        INSERT INTO scores (game_slug, player_name, score, created_at)
        VALUES (?, ?, ?, ?)
      `)
      .run(slug, playerName, score, now);

    return {
      id: Number(result.lastInsertRowid),
      gameSlug: slug,
      playerName,
      score,
      createdAt: now,
    };
  }

  close(): void {
    this.database.close();
  }
}
