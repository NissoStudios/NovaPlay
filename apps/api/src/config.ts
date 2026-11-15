import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_PATH: z.string().min(1).default("./data/novaplay.db"),
  ADMIN_USERNAME: z.string().min(3).max(64).default("admin"),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databasePath: string;
  adminUsername: string;
  adminPassword: string;
  sessionSecret: string;
  webOrigin: string;
  secureCookies: boolean;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(environment);

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Configuration invalide:\n${messages.join("\n")}`);
  }

  const values = parsed.data;
  const isProduction = values.NODE_ENV === "production";

  if (isProduction && (!values.ADMIN_PASSWORD || !values.SESSION_SECRET)) {
    throw new Error("ADMIN_PASSWORD et SESSION_SECRET sont obligatoires en production.");
  }

  if (!isProduction && (!values.ADMIN_PASSWORD || !values.SESSION_SECRET)) {
    console.warn(
      "[NovaPlay] Identifiants de développement actifs. Copiez .env.example vers .env avant tout déploiement.",
    );
  }

  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    databasePath: path.resolve(values.DATABASE_PATH),
    adminUsername: values.ADMIN_USERNAME,
    adminPassword: values.ADMIN_PASSWORD ?? "NovaPlay-Dev-Admin-2026!",
    sessionSecret:
      values.SESSION_SECRET ?? "novaplay-development-session-secret-2026",
    webOrigin: values.WEB_ORIGIN.replace(/\/$/, ""),
    secureCookies: isProduction,
  };
}
