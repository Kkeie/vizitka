/**
 * Дополнительные сценарии профиля: отдельный пользователь на тест, где нужна изоляция.
 * См. docs/TESTS-EXPLAINED.md.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth, uniqueName } from "./helpers";

describe("Профиль: что видит пользователь после сохранения", () => {
  it("пустой PATCH без полей — профиль не ломается, ответ 200", async () => {
    const u = uniqueName("patch_empty");
    const { token } = await register(app, u, "password123");
    const res = await request(app).patch("/api/profile/").set(auth(token)).send({});
    expect(res.status).toBe(200);
    expect(res.body.username).toBeTruthy();
  });

  it("можно задать ссылку на фон и на картинку аватара — поля приходят обратно в JSON", async () => {
    const u = uniqueName("images");
    const { token } = await register(app, u, "password123");
    const res = await request(app)
      .patch("/api/profile/")
      .set(auth(token))
      .send({
        avatarUrl: "/uploads/avatar_test.jpg",
        backgroundUrl: "/uploads/bg_test.png",
      });
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toContain("avatar_test");
    expect(res.body.backgroundUrl).toContain("bg_test");
    const get = await request(app).get("/api/profile/").set(auth(token));
    expect(get.body.avatarUrl).toBe(res.body.avatarUrl);
  });

  it("layout и blockSizes можно сохранить как JSON-объекты — потом они приходят объектами, не строкой", async () => {
    const u = uniqueName("layout");
    const { token } = await register(app, u, "password123");
    const layout = { mobile: [[1]], tablet: [[1]], desktop: [[1]] };
    const blockSizes = { 1: { w: 2, h: 1 } };
    const patch = await request(app)
      .patch("/api/profile/")
      .set(auth(token))
      .send({ layout, blockSizes });
    expect(patch.status).toBe(200);
    expect(patch.body.layout).toEqual(layout);
    expect(patch.body.blockSizes).toEqual(blockSizes);
  });
});

describe("Профиль: смена ника и границы ошибок", () => {
  it("слишком короткий новый ник при PATCH — отказ с понятным кодом ошибки", async () => {
    const u = uniqueName("short_patch");
    const { token } = await register(app, u, "password123");
    const res = await request(app).patch("/api/profile/").set(auth(token)).send({ username: "ab" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username_too_short");
  });

  it("слишком длинный новый ник при PATCH — username_too_long", async () => {
    const u = uniqueName("long_patch");
    const { token } = await register(app, u, "password123");
    const res = await request(app).patch("/api/profile/").set(auth(token)).send({ username: "a".repeat(33) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username_too_long");
  });

  it("после смены ника /api/user/me показывает уже новый username", async () => {
    const u = uniqueName("rename_me");
    const { token } = await register(app, u, "password123");
    const newName = uniqueName("renamed");
    await request(app).patch("/api/profile/").set(auth(token)).send({ username: newName });
    const me = await request(app).get("/api/user/me").set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.username).toBe(newName);
  });
});

describe("Защита: без «пропуска» профиль не отдать", () => {
  it("PATCH профиля без токена — отказ", async () => {
    const res = await request(app).patch("/api/profile/").send({ name: "Hacker" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  it("GET /api/user/me без заголовка Authorization — отказ", async () => {
    const res = await request(app).get("/api/user/me");
    expect(res.status).toBe(401);
  });
});
