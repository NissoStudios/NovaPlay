import {
  GAME_CATEGORIES,
  GAME_DIFFICULTIES,
  INTERNAL_GAME_IDS,
} from "@novaplay/shared";
import { z } from "zod";

const nullableHttpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Une URL HTTPS est requise.")
  .nullable();

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const gameInputSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Utilisez des minuscules et des tirets."),
    title: z.string().trim().min(2).max(80),
    shortDescription: z.string().trim().min(10).max(180),
    description: z.string().trim().min(20).max(2_000),
    category: z.enum(GAME_CATEGORIES),
    tags: z.array(z.string().trim().min(1).max(30)).max(8),
    sourceType: z.enum(["internal", "embed"]),
    internalGameId: z.enum(INTERNAL_GAME_IDS).nullable(),
    embedUrl: nullableHttpsUrl,
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    icon: z.string().trim().min(1).max(16),
    difficulty: z.enum(GAME_DIFFICULTIES),
    status: z.enum(["draft", "published"]),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(100_000),
  })
  .superRefine((value, context) => {
    if (value.sourceType === "internal") {
      if (!value.internalGameId) {
        context.addIssue({
          code: "custom",
          path: ["internalGameId"],
          message: "Sélectionnez un jeu interne.",
        });
      }
      if (value.embedUrl) {
        context.addIssue({
          code: "custom",
          path: ["embedUrl"],
          message: "Un jeu interne ne peut pas avoir d’URL intégrée.",
        });
      }
    } else {
      if (!value.embedUrl) {
        context.addIssue({
          code: "custom",
          path: ["embedUrl"],
          message: "L’URL HTTPS du jeu est requise.",
        });
      }
      if (value.internalGameId) {
        context.addIssue({
          code: "custom",
          path: ["internalGameId"],
          message: "Un jeu intégré ne peut pas utiliser un jeu interne.",
        });
      }
    }
  });

export const gameListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.enum(GAME_CATEGORIES).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const leaderboardQuerySchema = z.object({
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const scoreSubmissionSchema = z.object({
  playerName: z
    .string()
    .trim()
    .min(2, "Le pseudo doit contenir au moins 2 caractères.")
    .max(24, "Le pseudo ne peut pas dépasser 24 caractères.")
    .regex(/^[a-zA-Z0-9À-ÿ _-]+$/, "Caractères autorisés : lettres, chiffres, espaces, - et _."),
  score: z.number().int().min(0).max(10_000_000),
});

export function zodDetails(error: z.ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "body";
    details[key] ??= [];
    details[key].push(issue.message);
  }
  return details;
}
