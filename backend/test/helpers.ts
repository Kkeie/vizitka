import request from "supertest";
import type { Express } from "express";
import { db } from "../src/utils/db";

/** Уникальное имя пользователя для тестов (без коллизий при повторном запуске). */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function clearVerificationForTests(userId: number) {
  db.prepare(
    `UPDATE User SET emailVerified = 1, emailVerifyTokenHash = NULL, emailVerifyExpiresAt = NULL, emailVerifySentAt = NULL, deviceResumeTokenHash = NULL, deviceResumeTokenExpiresAt = NULL WHERE id = ?`,
  ).run(userId);
}

export async function register(
  app: Express,
  username: string,
  passwordOrEmail = "pass1234",
  maybePassword?: string
): Promise<{ status: number; token: string; userId: number }> {
  const defaultEmail = `${username}@example.test`;
  const isEmail = passwordOrEmail.includes("@");
  const email = maybePassword ? passwordOrEmail : isEmail ? passwordOrEmail : defaultEmail;
  const password = maybePassword ?? (isEmail ? "pass1234" : passwordOrEmail);

  const res = await request(app).post("/api/auth/register").send({ username, email, password });
  if (res.status !== 200) {
    return { status: res.status, token: (res.body.token as string) || "", userId: (res.body.user?.id as number) || 0 };
  }
  if (res.body.token) {
    return { status: 200, token: res.body.token as string, userId: res.body.user.id as number };
  }
  if (res.body.verificationRequired && res.body.user?.id) {
    clearVerificationForTests(res.body.user.id as number);
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    return {
      status: 200,
      token: loginRes.body.token as string,
      userId: res.body.user.id as number,
    };
  }
  return { status: res.status, token: "", userId: (res.body.user?.id as number) || 0 };
}

export async function login(
  app: Express,
  email: string,
  password: string
): Promise<{ status: number; token?: string; body: Record<string, unknown> }> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return {
    status: res.status,
    token: res.body.token as string | undefined,
    body: res.body as Record<string, unknown>,
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
