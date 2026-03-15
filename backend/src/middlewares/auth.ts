import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface AuthRequest extends Request {
  userId?: number;
}

let cachedJwtSecret: string | null = null;
function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 32) {
    cachedJwtSecret = envSecret;
    return cachedJwtSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set and contain at least 32 characters in production");
  }
  cachedJwtSecret = crypto.randomBytes(48).toString("hex");
  return cachedJwtSecret;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "unauthorized" });

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as jwt.JwtPayload | string;
    if (typeof payload !== "object" || payload == null) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(401).json({ error: "unauthorized" });
    }
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}
