/**
 * Подтверждение email: ссылка из письма → POST /api/auth/verify-email.
 * Отправку письма мокируем, чтобы достать одноразовый токен из вызова mailer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { sendVerificationEmail, buildEmailVerificationUrl } from "../src/utils/mailer";

vi.mock("../src/utils/mailer", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailVerificationUrl: vi.fn((t: string) => `http://frontend.test/verify-email?token=${encodeURIComponent(t)}`),
}));

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.mocked(sendVerificationEmail).mockClear();
    vi.mocked(buildEmailVerificationUrl).mockClear();
  });

  it("валидный токен из «письма» выдаёт JWT и помечает почту подтверждённой", async () => {
    const u = `verify_ok_${Date.now()}`;
    const email = `${u}@example.test`;
    const reg = await request(app).post("/api/auth/register").send({ username: u, email, password: "password123" });
    expect(reg.status).toBe(200);
    expect(reg.body.verificationRequired).toBe(true);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    const verifyUrl = vi.mocked(sendVerificationEmail).mock.calls[0][1] as string;
    const token = new URL(verifyUrl).searchParams.get("token");
    expect(token).toBeTruthy();

    const badLogin = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    expect(badLogin.status).toBe(403);

    const done = await request(app).post("/api/auth/verify-email").send({ token });
    expect(done.status).toBe(200);
    expect(typeof done.body.token).toBe("string");
    expect(done.body.user?.emailVerified === true || done.body.user?.profile).toBeTruthy();

    const me = await request(app).get("/api/user/me").set({ Authorization: `Bearer ${done.body.token}` });
    expect(me.status).toBe(200);
    expect(me.body.emailVerified).toBe(true);
  });

  it("повтор с тем же токеном — отказ (одноразовый)", async () => {
    const u = `verify_twice_${Date.now()}`;
    const email = `${u}@example.test`;
    await request(app).post("/api/auth/register").send({ username: u, email, password: "password123" });
    const verifyUrl = vi.mocked(sendVerificationEmail).mock.calls.at(-1)![1] as string;
    const token = new URL(verifyUrl).searchParams.get("token")!;
    const first = await request(app).post("/api/auth/verify-email").send({ token });
    expect(first.status).toBe(200);
    const second = await request(app).post("/api/auth/verify-email").send({ token });
    expect(second.status).toBe(400);
    expect(second.body.error).toBe("invalid_or_expired_token");
  });

  it("пустой токен — 400 token_required", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({ token: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("token_required");
  });
});

describe("POST /api/auth/resume-registration", () => {
  beforeEach(() => {
    vi.mocked(sendVerificationEmail).mockClear();
  });

  it("до подтверждения почты — ready: false; после verify — JWT", async () => {
    const u = `resume_dev_${Date.now()}`;
    const email = `${u}@example.test`;
    const reg = await request(app).post("/api/auth/register").send({ username: u, email, password: "password123" });
    expect(reg.status).toBe(200);
    const deviceToken = reg.body.deviceResumeToken as string;
    expect(deviceToken).toBeTruthy();

    const wait1 = await request(app).post("/api/auth/resume-registration").send({ deviceResumeToken: deviceToken });
    expect(wait1.status).toBe(200);
    expect(wait1.body).toEqual({ ready: false });

    const verifyUrl = vi.mocked(sendVerificationEmail).mock.calls.at(-1)![1] as string;
    const emailToken = new URL(verifyUrl).searchParams.get("token")!;
    const verified = await request(app).post("/api/auth/verify-email").send({ token: emailToken });
    expect(verified.status).toBe(200);

    const wait2 = await request(app).post("/api/auth/resume-registration").send({ deviceResumeToken: deviceToken });
    expect(wait2.status).toBe(200);
    expect(wait2.body.ready).toBe(true);
    expect(typeof wait2.body.token).toBe("string");

    const wait3 = await request(app).post("/api/auth/resume-registration").send({ deviceResumeToken: deviceToken });
    expect(wait3.status).toBe(400);
    expect(wait3.body.error).toBe("invalid_or_expired_device_resume");
  });

  it("неверный токен — 400", async () => {
    const res = await request(app).post("/api/auth/resume-registration").send({ deviceResumeToken: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_or_expired_device_resume");
  });
});

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.mocked(sendVerificationEmail).mockClear();
  });

  it("повторная отправка для неподтверждённого пользователя вызывает send снова", async () => {
    const u = `resend_${Date.now()}`;
    const email = `${u}@example.test`;
    await request(app).post("/api/auth/register").send({ username: u, email, password: "password123" });
    const n1 = vi.mocked(sendVerificationEmail).mock.calls.length;
    const res = await request(app).post("/api/auth/resend-verification").send({ email });
    expect(res.status).toBe(200);
    expect(vi.mocked(sendVerificationEmail).mock.calls.length).toBeGreaterThan(n1);
  });
});
