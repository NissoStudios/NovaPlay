import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import {
  clearSessionCookie,
  createRequireAdmin,
  credentialsAreValid,
  setSessionCookie,
} from "./auth.js";
import type { AppConfig } from "./config.js";
import type { NovaPlayDatabase } from "./database.js";
import {
  gameInputSchema,
  gameListQuerySchema,
  leaderboardQuerySchema,
  loginSchema,
  scoreSubmissionSchema,
  zodDetails,
} from "./validation.js";

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function parseId(value: unknown): number {
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_ID", "L’identifiant du jeu est invalide.");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, "INVALID_ID", "L’identifiant du jeu est invalide.");
  }
  return id;
}

function parseSlug(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new HttpError(400, "INVALID_SLUG", "Le slug du jeu est invalide.");
  }
  return value;
}

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1"];

// Hors production, Vite est servi sur 127.0.0.1 alors que WEB_ORIGIN vise localhost :
// les deux désignent la même machine. En production, seule WEB_ORIGIN est acceptée.
function trustedOrigins(config: AppConfig): Set<string> {
  const origins = new Set([config.webOrigin]);
  if (config.nodeEnv === "production") {
    return origins;
  }
  const { protocol, hostname, port } = new URL(config.webOrigin);
  if (LOOPBACK_HOSTS.includes(hostname)) {
    for (const host of LOOPBACK_HOSTS) {
      origins.add(`${protocol}//${host}${port ? `:${port}` : ""}`);
    }
  }
  return origins;
}

export interface AppDependencies {
  database: NovaPlayDatabase;
  config: AppConfig;
}

export function createApp({ database, config }: AppDependencies) {
  const app = express();
  const requireAdmin = createRequireAdmin(config);
  const allowedOrigins = trustedOrigins(config);

  app.disable("x-powered-by");
  if (config.nodeEnv === "production") {
    app.set("trust proxy", 1);
  }
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameSrc: ["'self'", "https:"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());

  app.use((request, response, next) => {
    if (request.path.startsWith("/api/")) {
      response.setHeader("Cache-Control", "no-store");
    }
    const origin = request.get("origin");
    if (
      origin &&
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      request.method !== "OPTIONS" &&
      !allowedOrigins.has(origin)
    ) {
      response.status(403).json({
        error: {
          code: "ORIGIN_REJECTED",
          message: "L’origine de la requête n’est pas autorisée.",
        },
      });
      return;
    }
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/games", (request, response, next) => {
    const query = gameListQuerySchema.safeParse(request.query);
    if (!query.success) {
      next(query.error);
      return;
    }
    response.json({ games: database.listPublicGames(query.data) });
  });

  app.get("/api/games/:slug", (request, response, next) => {
    const slug = parseSlug(request.params.slug);
    const game = database.getPublicGameBySlug(slug);
    if (!game) {
      next(new HttpError(404, "GAME_NOT_FOUND", "Ce jeu est introuvable."));
      return;
    }
    response.json({ game });
  });

  const playLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === "test" ? 1_000 : 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "PLAY_RATE_LIMITED",
        message: "Le compteur de parties reçoit trop de requêtes.",
      },
    },
  });

  app.post("/api/games/:slug/play", playLimiter, (request, response, next) => {
    const slug = parseSlug(request.params.slug);
    const game = database.incrementPlayCount(slug);
    if (!game) {
      next(new HttpError(404, "GAME_NOT_FOUND", "Ce jeu est introuvable."));
      return;
    }
    response.json({ playCount: game.playCount });
  });

  app.get("/api/games/:slug/leaderboard", (request, response, next) => {
    const slug = parseSlug(request.params.slug);
    const game = database.getPublicGameBySlug(slug);
    if (!game) {
      next(new HttpError(404, "GAME_NOT_FOUND", "Ce jeu est introuvable."));
      return;
    }
    const query = leaderboardQuerySchema.safeParse(request.query);
    if (!query.success) {
      next(query.error);
      return;
    }
    response.json({ entries: database.listLeaderboard(slug, query.data.order) });
  });

  const scoreLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === "test" ? 1_000 : 40,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "SCORE_RATE_LIMITED",
        message: "Trop de scores soumis. Réessayez dans quelques minutes.",
      },
    },
  });

  app.post("/api/games/:slug/scores", scoreLimiter, (request, response, next) => {
    const slug = parseSlug(request.params.slug);
    const game = database.getPublicGameBySlug(slug);
    if (!game) {
      next(new HttpError(404, "GAME_NOT_FOUND", "Ce jeu est introuvable."));
      return;
    }
    const body = scoreSubmissionSchema.safeParse(request.body);
    if (!body.success) {
      next(body.error);
      return;
    }
    const query = leaderboardQuerySchema.safeParse(request.query);
    const order = query.success ? query.data.order : "desc";
    const entry = database.submitScore(slug, body.data.playerName, body.data.score);
    response.status(201).json({
      entry,
      entries: database.listLeaderboard(slug, order),
    });
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === "test" ? 1_000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "LOGIN_RATE_LIMITED",
        message: "Trop de tentatives. Réessayez dans quelques minutes.",
      },
    },
  });

  app.post("/api/admin/login", loginLimiter, (request, response, next) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      next(body.error);
      return;
    }
    if (!credentialsAreValid(body.data.username, body.data.password, config)) {
      next(new HttpError(401, "INVALID_CREDENTIALS", "Identifiant ou mot de passe incorrect."));
      return;
    }
    setSessionCookie(response, config);
    response.json({ admin: { username: config.adminUsername } });
  });

  app.post("/api/admin/logout", (_request, response) => {
    clearSessionCookie(response, config);
    response.status(204).end();
  });

  app.get("/api/admin/session", requireAdmin, (_request, response) => {
    response.json({ admin: { username: config.adminUsername } });
  });

  app.get("/api/admin/stats", requireAdmin, (_request, response) => {
    response.json({ stats: database.getStats() });
  });

  app.get("/api/admin/games", requireAdmin, (_request, response) => {
    response.json({ games: database.listAdminGames() });
  });

  app.post("/api/admin/games", requireAdmin, (request, response, next) => {
    const body = gameInputSchema.safeParse(request.body);
    if (!body.success) {
      next(body.error);
      return;
    }
    if (database.getGameBySlug(body.data.slug)) {
      next(new HttpError(409, "SLUG_ALREADY_EXISTS", "Ce slug est déjà utilisé."));
      return;
    }
    response.status(201).json({ game: database.createGame(body.data) });
  });

  app.put("/api/admin/games/:id", requireAdmin, (request, response, next) => {
    const id = parseId(request.params.id ?? "");
    const body = gameInputSchema.safeParse(request.body);
    if (!body.success) {
      next(body.error);
      return;
    }
    const slugOwner = database.getGameBySlug(body.data.slug);
    if (slugOwner && slugOwner.id !== id) {
      next(new HttpError(409, "SLUG_ALREADY_EXISTS", "Ce slug est déjà utilisé."));
      return;
    }
    const game = database.updateGame(id, body.data);
    if (!game) {
      next(new HttpError(404, "GAME_NOT_FOUND", "Ce jeu est introuvable."));
      return;
    }
    response.json({ game });
  });

  app.delete("/api/admin/games/:id", requireAdmin, (request, response, next) => {
    const id = parseId(request.params.id ?? "");
    if (!database.deleteGame(id)) {
      next(new HttpError(404, "GAME_NOT_FOUND", "Ce jeu est introuvable."));
      return;
    }
    response.status(204).end();
  });

  if (config.nodeEnv === "production") {
    const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
    const webDirectory = path.resolve(currentDirectory, "../../web/dist");
    app.use(express.static(webDirectory, { maxAge: "1h", index: false }));
    app.use((request, response, next) => {
      if (
        request.method === "GET" &&
        !request.path.startsWith("/api/") &&
        request.accepts("html")
      ) {
        response.sendFile(path.join(webDirectory, "index.html"));
        return;
      }
      next();
    });
  }

  app.use((_request, _response, next) => {
    next(new HttpError(404, "ROUTE_NOT_FOUND", "Cette route n’existe pas."));
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    void _next;
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Les données envoyées sont invalides.",
          details: zodDetails(error),
        },
      });
      return;
    }
    if (error instanceof HttpError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    console.error("[NovaPlay] Erreur API non gérée", error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Une erreur interne est survenue.",
      },
    });
  };
  app.use(errorHandler);

  return app;
}
