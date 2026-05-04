/**
 * Базовые сценарии входа и регистрации (документ TEST-CASES: TC-AUTH-01 … TC-AUTH-11).
 * Простыми словами: каждый тест имитирует запрос приложения к серверу и проверяет ответ.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth } from "./helpers";

describe("POST /api/auth/register — создать новый аккаунт", () => {
  it("TC-AUTH-01: успешная регистрация — приходит «пропуск» (token) и карточка пользователя", async () => {
    const u = `newuser_01_${Date.now()}`;
    const email = `${u}@example.test`;
    const res = await request(app).post("/api/auth/register").send({ username: u, email, password: "password123" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user).toMatchObject({
      id: expect.any(Number),
      username: u,
      createdAt: expect.any(String),
    });
    expect(res.body.user.profile).not.toBeNull();
    expect(res.body.user.profile).toMatchObject({
      username: u,
      userId: res.body.user.id,
    });
  });

  it("TC-AUTH-02: пустая форма — сервер просит и логин, и пароль", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "username_email_and_password_required" });
  });

  it("TC-AUTH-03: ник из двух букв — отказ (слишком коротко)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "ab", email: "ab@example.test", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "username_too_short" });
  });

  it("TC-AUTH-04: пароль из трёх букв — отказ (минимум 4 символа)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: `newuser_04_${Date.now()}`, email: `newuser_04_${Date.now()}@example.test`, password: "abc" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "password_too_short" });
  });

  it("TC-AUTH-05: второй раз тот же ник — «занято» и список похожих свободных ников", async () => {
    const u = `existinguser_${Date.now()}`;
    const first = await register(app, u, `${u}@example.test`, "password123");
    expect(first.status).toBe(200);
    const res = await request(app).post("/api/auth/register").send({
      username: u,
      email: `new_${u}@example.test`,
      password: "password123",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("username_taken");
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  it("TC-AUTH-05b: второй раз тот же email — отказ с email_taken", async () => {
    const suffix = Date.now();
    const email = `used_${suffix}@example.test`;
    const first = await register(app, `existing_mail_${suffix}`, email, "password123");
    expect(first.status).toBe(200);
    const res = await request(app).post("/api/auth/register").send({
      username: `new_user_${suffix}`,
      email,
      password: "password123",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("email_taken");
  });
});

describe("POST /api/auth/login — войти существующим пользователем", () => {
  it("TC-AUTH-06: правильный логин и пароль — можно сразу открыть профиль по токену", async () => {
    const u = `alice_${Date.now()}`;
    const email = `${u}@example.test`;
    const reg = await register(app, u, email, "password123");
    expect(reg.status).toBe(200);
    const res = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toBeTruthy();
    const me = await request(app).get("/api/profile/").set(auth(res.body.token));
    expect(me.status).toBe(200);
  });

  it("TC-AUTH-07: неверный пароль — «неверные данные», без подсказки какой именно поле", async () => {
    const u = `alice_wp_${Date.now()}`;
    const email = `${u}@example.test`;
    await register(app, u, email, "password123");
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("TC-AUTH-08: такого пользователя нет — тот же ответ, что и при неверном пароле (не палим существование)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `nobody_at_all_${Date.now()}@example.test`, password: "password123" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "invalid_credentials" });
  });
});

describe("POST /api/auth/check-username — свободен ли ник (как подсказка при вводе)", () => {
  it("TC-AUTH-09: свободный ник — available: true", async () => {
    const res = await request(app)
      .post("/api/auth/check-username")
      .send({ username: `freenick_99_${Date.now()}` });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true, suggestions: [] });
  });

  it("TC-AUTH-10: ник уже занят — available: false и есть альтернативы", async () => {
    const u = `alice_${Date.now()}`;
    await register(app, u, "password123");
    const res = await request(app).post("/api/auth/check-username").send({ username: u });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  it("TC-AUTH-11: проверка слишком короткого ника — та же ошибка, что при регистрации", async () => {
    const res = await request(app).post("/api/auth/check-username").send({ username: "ab" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "username_too_short" });
  });
});

describe("POST /api/auth/check-email — свободен ли email до регистрации", () => {
  it("TC-AUTH-12: свободный email — available: true", async () => {
    const res = await request(app)
      .post("/api/auth/check-email")
      .send({ email: `free_${Date.now()}@example.test` });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });
  });

  it("TC-AUTH-13: занятый email — available: false", async () => {
    const u = `email_busy_${Date.now()}`;
    const email = `${u}@example.test`;
    await register(app, u, email, "password123");
    const res = await request(app).post("/api/auth/check-email").send({ email });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it("TC-AUTH-14: невалидный email — ошибка формата", async () => {
    const res = await request(app).post("/api/auth/check-email").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_email_format" });
  });
});
