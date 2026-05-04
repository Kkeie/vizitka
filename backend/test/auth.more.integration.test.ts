/**
 * Дополнительные сценарии аутентификации: крайние случаи и «житейская логика».
 * См. пояснения в docs/TESTS-EXPLAINED.md (раздел «Дополнительно: аутентификация»).
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth, login, uniqueName } from "./helpers";

describe("Регистрация — поведение, которое должен заметить пользователь", () => {
  it("ник сохраняется в нижнем регистре, если ввести буквы по-разному", async () => {
    const base = uniqueName("MiXeD");
    const email = `${base}@example.test`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: base.toUpperCase(), email, password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(base.toLowerCase());
  });

  it("нельзя зарегистрироваться с символом @ в нике — сервер отклоняет формат", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "bad@nick", email: "badnick@example.test", password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_username_format");
  });

  it("зарезервированное слово «login» как ник — как будто ник занят (нужно другое имя)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "login",
      email: `login_${Date.now()}@example.test`,
      password: "password123",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("username_taken");
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  it("после успешной регистрации выдаётся длинная строка-токен — это «пропуск» в личный кабинет", async () => {
    const u = uniqueName("tok");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: u, email: `${u}@example.test`, password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token.length).toBeGreaterThan(20);
    const me = await request(app).get("/api/user/me").set(auth(res.body.token));
    expect(me.status).toBe(200);
  });
});

describe("Вход — защита от пустых полей и неверных данных", () => {
  it("если не передать логин и пароль вообще — сервер просит заполнить поля", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email_and_password_required");
  });

  it("если передать только логин без пароля — тоже ошибка «нужны оба поля»", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "someone@example.test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email_and_password_required");
  });

  it("пароль можно ввести с другим регистром букв в логине — ищется тот же ник в базе", async () => {
    const u = uniqueName("case_login");
    const email = `${u}@example.test`;
    await register(app, u, email, "secret5678");
    const res = await login(app, email.toUpperCase(), "secret5678");
    expect(res.status).toBe(200);
    expect(res.token).toBeTruthy();
  });

  it("один и тот же человек может войти повторно — каждый раз выдаётся новый токен (сессия обновляется)", async () => {
    const u = uniqueName("twice");
    const email = `${u}@example.test`;
    await register(app, u, email, "password123");
    const a = await login(app, email, "password123");
    const b = await login(app, email, "password123");
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(typeof a.token).toBe("string");
    expect(typeof b.token).toBe("string");
  });
});

describe("Проверка свободного ника перед регистрацией", () => {
  it("если поле username не отправили — сервер говорит, что ник обязателен", async () => {
    const res = await request(app).post("/api/auth/check-username").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username_required");
  });

  it("если ник свободен — в ответе явно «available: true» и нет навязанных вариантов", async () => {
    const res = await request(app)
      .post("/api/auth/check-username")
      .send({ username: uniqueName("free") });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.suggestions).toEqual([]);
  });

  it("если ник занят — приходят альтернативы, каждая — обычная строка (можно скопировать)", async () => {
    const u = uniqueName("busy");
    await register(app, u, "password123");
    const res = await request(app).post("/api/auth/check-username").send({ username: u });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    for (const s of res.body.suggestions as string[]) {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it("короткий ник при проверке — та же ошибка, что и при регистрации (не меньше 3 символов)", async () => {
    const res = await request(app).post("/api/auth/check-username").send({ username: "no" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username_too_short");
  });
});
