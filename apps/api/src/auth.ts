import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "./config.js";

export const SESSION_COOKIE = "novaplay_admin";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;

interface SessionPayload {
  sub: string;
  exp: number;
}

function digest(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

function sign(value: string, secret: string): string {
  return digest(value, secret).toString("base64url");
}

function encodeSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

function decodeSession(token: string, secret: string): SessionPayload | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) {
    return null;
  }

  const expected = sign(body, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("sub" in parsed) ||
      !("exp" in parsed) ||
      typeof parsed.sub !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { sub: parsed.sub, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function credentialsAreValid(
  username: string,
  password: string,
  config: AppConfig,
): boolean {
  const usernameMatches = timingSafeEqual(
    digest(username, config.sessionSecret),
    digest(config.adminUsername, config.sessionSecret),
  );
  const passwordMatches = timingSafeEqual(
    digest(password, config.sessionSecret),
    digest(config.adminPassword, config.sessionSecret),
  );
  return usernameMatches && passwordMatches;
}

export function setSessionCookie(response: Response, config: AppConfig): void {
  const token = encodeSession(
    {
      sub: config.adminUsername,
      exp: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
    },
    config.sessionSecret,
  );

  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_LIFETIME_SECONDS * 1000,
    sameSite: "strict",
    secure: config.secureCookies,
    path: "/api/admin",
  });
}

export function clearSessionCookie(response: Response, config: AppConfig): void {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.secureCookies,
    path: "/api/admin",
  });
}

export function createRequireAdmin(config: AppConfig) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const token = request.cookies[SESSION_COOKIE];
    const session = typeof token === "string" ? decodeSession(token, config.sessionSecret) : null;

    if (!session || session.sub !== config.adminUsername) {
      response.status(401).json({
        error: {
          code: "ADMIN_AUTH_REQUIRED",
          message: "Une connexion administrateur valide est requise.",
        },
      });
      return;
    }

    next();
  };
}
