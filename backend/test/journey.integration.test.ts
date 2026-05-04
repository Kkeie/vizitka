/**
 * Сквозные сценарии «как у живого пользователя»: регистрация → профиль → блок → публичная витрина.
 * Каждый тест самодостаточен и использует уникальные имена.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth, uniqueName } from "./helpers";

describe("Путь пользователя от нуля до публичной страницы", () => {
  it("зарегистрировался → обновил имя → добавил заметку → гость видит то же имя и текст без пароля", async () => {
    const u = uniqueName("journey");
    const { token } = await register(app, u, "password123");
    expect(token).toBeTruthy();

    await request(app)
      .patch("/api/profile/")
      .set(auth(token))
      .send({ name: "Герой теста", bio: "Описание" });

    await request(app)
      .post("/api/blocks/")
      .set(auth(token))
      .send({ type: "note", note: "Привет, мир!" });

    const pub = await request(app).get(`/api/public/${u}`);
    expect(pub.status).toBe(200);
    expect(pub.body.name).toBe("Герой теста");
    expect(JSON.stringify(pub.body).toLowerCase()).not.toContain("password");
    const notes = pub.body.blocks.filter((b: { type: string }) => b.type === "note");
    expect(notes.some((b: { note?: string }) => b.note?.includes("Привет"))).toBe(true);
  });

  it("вошёл второй раз тем же паролем — снова можно читать профиль", async () => {
    const u = uniqueName("relog");
    await register(app, u, "password123");
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: `${u}@example.test`, password: "password123" });
    expect(login.status).toBe(200);
    const p = await request(app).get("/api/profile/").set(auth(login.body.token));
    expect(p.status).toBe(200);
    expect(p.body.username).toBe(u);
  });
});
