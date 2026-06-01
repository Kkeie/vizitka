/**
 * Смена email в профиле: письмо подтверждения → verify-email → новый email в User и Profile.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { db } from "../src/utils/db";
import { register, auth, login } from "./helpers";

const sentVerifyUrls: string[] = [];

vi.mock("../src/utils/mailer", () => ({
  buildEmailVerificationUrl: vi.fn((t: string) => `http://frontend.test/verify-email?token=${encodeURIComponent(t)}`),
  sendVerificationEmail: vi.fn(async (_to: string, url: string) => {
    sentVerifyUrls.push(url);
  }),
}));

describe("PATCH /api/profile email change verification", () => {
  let token: string;
  let userId: number;
  const oldEmail = `old_${Date.now()}@example.test`;
  const newEmail = `new_${Date.now()}@example.test`;

  beforeAll(async () => {
    const u = `email_change_${Date.now()}`;
    const reg = await register(app, u, oldEmail, "password123");
    expect(reg.status).toBe(200);
    token = reg.token;
    userId = reg.userId;
  });

  it("запрос смены email ставит pendingEmail и шлёт письмо", async () => {
    sentVerifyUrls.length = 0;
    const patch = await request(app)
      .patch("/api/profile/")
      .set(auth(token))
      .send({ email: newEmail });
    expect(patch.status).toBe(200);
    expect(patch.body.emailChangePending).toBe(true);
    expect(patch.body.pendingEmail).toBe(newEmail);
    expect(patch.body.email).toBe(oldEmail);
    expect(sentVerifyUrls.length).toBe(1);

    const row = db.prepare("SELECT email, pendingEmail, emailVerifyTokenHash FROM User WHERE id = ?").get(userId) as {
      email: string;
      pendingEmail: string | null;
      emailVerifyTokenHash: string | null;
    };
    expect(row.email).toBe(oldEmail);
    expect(row.pendingEmail).toBe(newEmail);
    expect(row.emailVerifyTokenHash).toBeTruthy();
  });

  it("до подтверждения вход только по старому email", async () => {
    const oldLogin = await login(app, oldEmail, "password123");
    expect(oldLogin.status).toBe(200);
    const newLogin = await login(app, newEmail, "password123");
    expect(newLogin.status).toBe(401);
  });

  it("подтверждение по ссылке применяет новый email", async () => {
    const url = sentVerifyUrls[sentVerifyUrls.length - 1];
    const rawToken = new URL(url).searchParams.get("token");
    expect(rawToken).toBeTruthy();

    const verify = await request(app).post("/api/auth/verify-email").send({ token: rawToken });
    expect(verify.status).toBe(200);
    expect(verify.body.purpose).toBe("email_change");

    const row = db.prepare("SELECT email, pendingEmail, emailVerified FROM User WHERE id = ?").get(userId) as {
      email: string;
      pendingEmail: string | null;
      emailVerified: number | null;
    };
    expect(row.email).toBe(newEmail);
    expect(row.pendingEmail).toBeNull();
    expect(row.emailVerified).toBe(1);

    const profile = await request(app).get("/api/profile/").set(auth(verify.body.token));
    expect(profile.body.email).toBe(newEmail);
    expect(profile.body.emailChangePending).toBe(false);

    const newLogin = await login(app, newEmail, "password123");
    expect(newLogin.status).toBe(200);
  });

  it("занятый email при смене — email_taken", async () => {
    const other = `other_${Date.now()}`;
    const otherEmail = `${other}@example.test`;
    await register(app, other, otherEmail, "password123");

    const patch = await request(app)
      .patch("/api/profile/")
      .set(auth(token))
      .send({ email: otherEmail });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe("email_taken");
  });
});
