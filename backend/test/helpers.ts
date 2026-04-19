import request from "supertest";
import type { Express } from "express";

/** Уникальное имя пользователя для тестов (без коллизий при повторном запуске). */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export async function register(
  app: Express,
  username: string,
  password = "pass1234"
): Promise<{ status: number; token: string; userId: number }> {
  const res = await request(app).post("/api/auth/register").send({ username, password });
  return {
    status: res.status,
    token: res.body.token as string,
    userId: res.body.user?.id as number,
  };
}

export async function login(
  app: Express,
  username: string,
  password: string
): Promise<{ status: number; token?: string; body: Record<string, unknown> }> {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return {
    status: res.status,
    token: res.body.token as string | undefined,
    body: res.body as Record<string, unknown>,
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
