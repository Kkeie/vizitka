import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

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
    return crypto.timingSafeEqual(Buffer.from(hashHex, "hex"), derived);
  } catch {
    return false;
  }
}

// ===== JWT =====
export function signToken(payload: { id: number; username: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export type AuthedUser = { id: number; username: string };
export type AuthedRequest = Request & { user?: AuthedUser };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    console.log(`[AUTH] No token for ${req.method} ${req.path}`);
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.id, username: decoded.username };
    console.log(`[AUTH] Authenticated user ${decoded.id} (${decoded.username}) for ${req.method} ${req.path}`);
    next();
  } catch (err) {
    console.log(`[AUTH] Invalid token for ${req.method} ${req.path}:`, err);
    return res.status(401).json({ error: "unauthorized" });
  }
}
