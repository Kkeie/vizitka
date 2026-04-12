import request from "supertest";
import type { Express } from "express";

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

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
