import type { Game, GameInput } from "@novaplay/shared";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import { NovaPlayDatabase } from "./database.js";

const config: AppConfig = {
  nodeEnv: "test",
  port: 3001,
  databasePath: ":memory:",
  adminUsername: "admin",
  adminPassword: "a-secure-test-password",
  sessionSecret: "a-test-session-secret-with-more-than-32-characters",
  webOrigin: "http://localhost:5173",
  secureCookies: false,
};

function toInput(game: Game): GameInput {
  return {
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
    status: game.status,
    featured: game.featured,
    sortOrder: game.sortOrder,
  };
}

describe("NovaPlay API", () => {
  let database: NovaPlayDatabase;

  beforeEach(() => {
    database = new NovaPlayDatabase(":memory:");
  });

  afterEach(() => {
    database.close();
  });

  it("returns the seeded public catalogue", async () => {
    const response = await request(createApp({ database, config })).get("/api/games").expect(200);

    expect(response.body.games).toHaveLength(12);
    expect(response.body.games[0]).toMatchObject({
      slug: "eco-arcade-hub",
      internalGameId: "eco-arcade-hub",
    });
    expect(response.body.games[0]).not.toHaveProperty("status");
  });

  it("increments the play counter", async () => {
    const app = createApp({ database, config });

    const response = await request(app).post("/api/games/neon-serpent/play").expect(200);
    expect(response.body.playCount).toBe(1);
  });

  it("submits and ranks leaderboard scores", async () => {
    const app = createApp({ database, config });

    await request(app)
      .post("/api/games/neon-serpent/scores")
      .send({ playerName: "NovaOne", score: 120 })
      .expect(201);
    await request(app)
      .post("/api/games/neon-serpent/scores")
      .send({ playerName: "AstroAce", score: 340 })
      .expect(201);

    const desc = await request(app).get("/api/games/neon-serpent/leaderboard").expect(200);
    expect(desc.body.entries.map((entry: { playerName: string }) => entry.playerName)).toEqual([
      "AstroAce",
      "NovaOne",
    ]);

    const asc = await request(app)
      .get("/api/games/neon-serpent/leaderboard?order=asc")
      .expect(200);
    expect(asc.body.entries.map((entry: { playerName: string }) => entry.playerName)).toEqual([
      "NovaOne",
      "AstroAce",
    ]);
  });

  it("serves modular arcade hubs without inline scripts under strict CSP", async () => {
    for (const file of ["../../web/public/arcade-hub.html", "../../web/public/arcade-hub-3d.html"]) {
      const htmlPath = fileURLToPath(new URL(file, import.meta.url));
      const html = readFileSync(htmlPath, "utf8");
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    }

    const response = await request(createApp({ database, config }))
      .get("/api/health")
      .expect(200);

    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
  });

  it("protects administration and accepts valid credentials", async () => {
    const app = createApp({ database, config });
    await request(app).get("/api/admin/games").expect(401);

    const agent = request.agent(app);
    await agent
      .post("/api/admin/login")
      .set("Origin", config.webOrigin)
      .send({ username: config.adminUsername, password: config.adminPassword })
      .expect(200);

    const response = await agent.get("/api/admin/games").expect(200);
    expect(response.body.games).toHaveLength(12);
  });

  it("rejects duplicate slugs through the admin API", async () => {
    const app = createApp({ database, config });
    const agent = request.agent(app);
    await agent
      .post("/api/admin/login")
      .set("Origin", config.webOrigin)
      .send({ username: config.adminUsername, password: config.adminPassword });

    const existing = database.getGameBySlug("neon-serpent");
    if (!existing) throw new Error("Le jeu de test est introuvable.");

    await agent
      .post("/api/admin/games")
      .set("Origin", config.webOrigin)
      .send(toInput(existing))
      .expect(409);
  });

  it("accepts the loopback alias of the web origin outside production only", async () => {
    const credentials = { username: config.adminUsername, password: config.adminPassword };
    const alias = "http://127.0.0.1:5173";

    await request(createApp({ database, config }))
      .post("/api/admin/login")
      .set("Origin", alias)
      .send(credentials)
      .expect(200);

    const production: AppConfig = { ...config, nodeEnv: "production", secureCookies: true };
    const rejected = await request(createApp({ database, config: production }))
      .post("/api/admin/login")
      .set("Origin", alias)
      .send(credentials)
      .expect(403);
    expect(rejected.body.error.code).toBe("ORIGIN_REJECTED");

    await request(createApp({ database, config: production }))
      .post("/api/admin/login")
      .set("Origin", config.webOrigin)
      .send(credentials)
      .expect(200);
  });

  it("rejects state-changing requests coming from a foreign origin", async () => {
    const response = await request(createApp({ database, config }))
      .post("/api/admin/login")
      .set("Origin", "https://evil.example")
      .send({ username: config.adminUsername, password: config.adminPassword })
      .expect(403);

    expect(response.body.error.code).toBe("ORIGIN_REJECTED");
  });

  it("creates, publishes, and deletes a game through administration", async () => {
    const app = createApp({ database, config });
    const agent = request.agent(app);
    await agent
      .post("/api/admin/login")
      .set("Origin", config.webOrigin)
      .send({ username: config.adminUsername, password: config.adminPassword })
      .expect(200);

    const template = database.getGameBySlug("neon-serpent");
    if (!template) throw new Error("Le jeu modèle est introuvable.");
    const input: GameInput = {
      ...toInput(template),
      slug: "jeu-de-validation",
      title: "Jeu de validation",
      status: "draft",
      featured: false,
    };

    const createdResponse = await agent
      .post("/api/admin/games")
      .set("Origin", config.webOrigin)
      .send(input)
      .expect(201);
    const createdId: number = createdResponse.body.game.id;

    await request(app).get("/api/games/jeu-de-validation").expect(404);

    await agent
      .put(`/api/admin/games/${createdId}`)
      .set("Origin", config.webOrigin)
      .send({ ...input, status: "published" })
      .expect(200);

    await request(app).get("/api/games/jeu-de-validation").expect(200);
    await agent
      .delete(`/api/admin/games/${createdId}`)
      .set("Origin", config.webOrigin)
      .expect(204);
    await request(app).get("/api/games/jeu-de-validation").expect(404);
  });
});
