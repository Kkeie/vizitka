import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "./db";

const JWT_ISSUER = "vizitka-backend";

let cachedJwtSecret: string | null = null;
function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 32) {
    cachedJwtSecret = envSecret;
    return cachedJwtSecret;
  }

  // Не падаем: локально часто NODE_ENV=production без .env (Windows и т.д.)
  // На хостинге JWT_SECRET обычно задан в панели — тогда используется ветка выше.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[AUTH] JWT_SECRET не задан или короче 32 символов — временный ключ для этого процесса. " +
        "Для локального теста без .env это нормально; на проде задайте JWT_SECRET в окружении."
    );
  } else {
    console.warn("[AUTH] JWT_SECRET is not set (or too short). Generated ephemeral dev secret for current process.");
  }

  cachedJwtSecret = crypto.randomBytes(48).toString("hex");
  return cachedJwtSecret;
}

// ===== Password hashing (без внешних зависимостей) =====
const SCRYPT_N = 16384, SCRYPT_r = 8, SCRYPT_p = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) =>
    crypto.scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }, (err, buf) => {
      if (err) reject(err); else resolve(buf);
    })
  );
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [alg, salt, hashHex] = stored.split("$");
    if (alg !== "scrypt" || !salt || !hashHex) return false;
    const derived = await new Promise<Buffer>((resolve, reject) =>
      crypto.scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }, (err, buf) => {
        if (err) reject(err); else resolve(buf);
      })
    );
    const hashBuffer = Buffer.from(hashHex, "hex");
    return crypto.timingSafeEqual(hashBuffer as any, derived as any);
  } catch {
    return false;
  }
}

// ===== JWT =====
function buildAuthBinding(userId: number, userCreatedAt: string, passwordHash: string): string {
  return crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${userId}:${userCreatedAt}:${passwordHash}`)
    .digest("base64url");
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer as any, rightBuffer as any);
}

export function signToken(payload: { id: number; username: string; userCreatedAt: string; passwordHash: string }) {
  const { passwordHash, ...tokenPayload } = payload;
  return jwt.sign({
    ...tokenPayload,
    authBinding: buildAuthBinding(payload.id, payload.userCreatedAt, passwordHash),
  }, getJwtSecret(), {
    expiresIn: "30d",
    algorithm: "HS256",
    issuer: JWT_ISSUER,
  });
}

export type AuthedUser = { id: number; username: string; userCreatedAt: string };
export type AuthedRequest = Request & { user?: AuthedUser };

function getTokenBoundUser(id: number, userCreatedAt: string) {
  return db.prepare(`
    SELECT u.id, u.createdAt, u.passwordHash, p.username
    FROM User u
    LEFT JOIN Profile p ON p.userId = u.id
    WHERE u.id = ? AND u.createdAt = ?
  `).get(id, userCreatedAt) as { id: number; createdAt: string; passwordHash: string; username: string | null } | undefined;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    console.log(`[AUTH] No token for ${req.method} ${req.path}`);
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
    }) as jwt.JwtPayload | string;

    if (typeof decoded !== "object" || decoded == null) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const id = Number(decoded.id);
    const username = String(decoded.username || "").trim().toLowerCase();
    const userCreatedAt = String(decoded.userCreatedAt || "");
    const authBinding = String(decoded.authBinding || "");
    if (!Number.isInteger(id) || id <= 0 || username.length < 1 || userCreatedAt.length < 1 || authBinding.length < 1) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const user = getTokenBoundUser(id, userCreatedAt);
    const expectedAuthBinding = user ? buildAuthBinding(user.id, user.createdAt, user.passwordHash) : "";
    if (!user || !safeStringEqual(authBinding, expectedAuthBinding)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const currentUsername = String(user.username || username).trim().toLowerCase();
    req.user = { id, username: currentUsername, userCreatedAt };
    console.log(`[AUTH] Authenticated user ${id} (${currentUsername}) for ${req.method} ${req.path}`);
    next();
  } catch (err) {
    console.log(`[AUTH] Invalid token for ${req.method} ${req.path}:`, err);
    return res.status(401).json({ error: "unauthorized" });
  }
}
