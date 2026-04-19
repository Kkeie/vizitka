/**
 * Публичная визитка: дополнительные проверки безопасности и удобства.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth, uniqueName } from "./helpers";

let slug: string;

beforeAll(async () => {
  slug = uniqueName("public_extra");
  const { token } = await register(app, slug, "password123");
  await request(app)
    .patch("/api/profile/")
    .set(auth(token))
    .send({ name: "Имя для всех", bio: "Коротко о себе" });
  await request(app)
    .post("/api/blocks/")
    .set(auth(token))
    .send({ type: "note", note: "Заметка на витрине" });
});

describe("Публичный API — кто угодно может прочитать витрину", () => {
  it("ник в адресе можно написать заглавными буквами — найдётся тот же профиль", async () => {
    const res = await request(app).get(`/api/public/${encodeURIComponent(slug.toUpperCase())}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Имя для всех");
  });

  it("в списке blocks у каждой карточки есть тип и текст заметки, как на сайте", async () => {
    const res = await request(app).get(`/api/public/${slug}`);
    expect(res.status).toBe(200);
    const notes = res.body.blocks.filter((b: { type: string }) => b.type === "note");
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toHaveProperty("id");
    expect(notes[0]).toHaveProperty("sort");
  });

  it("в ответе нет внутреннего поля userId у карточек в том виде, в каком хранится пароль", async () => {
    const res = await request(app).get(`/api/public/${slug}`);
    const raw = JSON.stringify(res.body);
    expect(raw.toLowerCase()).not.toContain("passwordhash");
  });

  it("несуществующий пользователь — код 404 и короткое сообщение об ошибке", async () => {
    const res = await request(app).get(`/api/public/${uniqueName("ghost")}_never_registered`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });
});
