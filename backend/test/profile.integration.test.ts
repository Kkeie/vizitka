/**
 * Профиль пользователя: чтение и сохранение данных (TC-PROF-01 … TC-PROF-08).
 * Подробности для непрограммистов — docs/TESTS-EXPLAINED.md.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth } from "./helpers";

let aliceToken: string;
let aliceUsername: string;
let bobToken: string;
let bobUsername: string;

beforeAll(async () => {
  const s = `${Date.now()}`;
  aliceUsername = `alice_prof_${s}`;
  bobUsername = `bob_prof_${s}`;
  const a = await register(app, aliceUsername, "password123");
  const b = await register(app, bobUsername, "password123");
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  aliceToken = a.token;
  bobToken = b.token;
});

describe("GET /api/profile/ — открыть свою анкету", () => {
  it("TC-PROF-01: в ответе есть все поля анкеты (имя, контакты, настройки сетки и т.д.)", async () => {
    const res = await request(app).get("/api/profile/").set(auth(aliceToken));
    expect(res.status).toBe(200);
    for (const key of [
      "id",
      "username",
      "name",
      "bio",
      "avatarUrl",
      "backgroundUrl",
      "phone",
      "email",
      "telegram",
      "layout",
      "blockSizes",
      "userId",
    ] as const) {
      expect(key in res.body).toBe(true);
    }
  });

  it("TC-PROF-02: без «пропуска» профиль не отдать — только ошибка unauthorized", async () => {
    const res = await request(app).get("/api/profile/");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthorized" });
  });
});

describe("PATCH /api/profile/ — сохранить изменения анкеты", () => {
  it("TC-PROF-03: сменили имя и описание — в следующем запросе те же строки", async () => {
    const patch = await request(app)
      .patch("/api/profile/")
      .set(auth(aliceToken))
      .send({ name: "Алиса Иванова", bio: "Дизайнер и разработчик" });
    expect(patch.status).toBe(200);
    expect(patch.body.name).toBe("Алиса Иванова");
    expect(patch.body.bio).toBe("Дизайнер и разработчик");
    const get = await request(app).get("/api/profile/").set(auth(aliceToken));
    expect(get.body.name).toBe("Алиса Иванова");
    expect(get.body.bio).toBe("Дизайнер и разработчик");
  });

  it("TC-PROF-04: телефон, почта, телеграм сохраняются и читаются обратно", async () => {
    await request(app)
      .patch("/api/profile/")
      .set(auth(aliceToken))
      .send({ phone: "+79001234567", email: "alice@example.com", telegram: "alice_tg" });
    const get = await request(app).get("/api/profile/").set(auth(aliceToken));
    expect(get.body.phone).toBe("+79001234567");
    expect(get.body.email).toBe("alice@example.com");
    expect(get.body.telegram).toBe("alice_tg");
  });

  it("TC-PROF-05: можно сменить ник на свободный — в профиле сразу новый логин", async () => {
    const newName = `alice_new_${Date.now()}`;
    const patch = await request(app).patch("/api/profile/").set(auth(aliceToken)).send({ username: newName });
    expect(patch.status).toBe(200);
    const get = await request(app).get("/api/profile/").set(auth(aliceToken));
    expect(get.body.username).toBe(newName);
    aliceUsername = newName;
  });

  it("TC-PROF-06: чужой ник занять нельзя — старый ник на месте", async () => {
    const before = await request(app).get("/api/profile/").set(auth(aliceToken));
    const unameBefore = before.body.username as string;
    const res = await request(app).patch("/api/profile/").set(auth(aliceToken)).send({ username: bobUsername });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username_taken");
    const after = await request(app).get("/api/profile/").set(auth(aliceToken));
    expect(after.body.username).toBe(unameBefore);
  });

  it("TC-PROF-07: поменяли только имя — описание «о себе» не стёрлось", async () => {
    const cur = await request(app).get("/api/profile/").set(auth(aliceToken));
    const prevBio = cur.body.bio as string | null;
    const res = await request(app).patch("/api/profile/").set(auth(aliceToken)).send({ name: "Новое имя" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Новое имя");
    const get = await request(app).get("/api/profile/").set(auth(aliceToken));
    expect(get.body.name).toBe("Новое имя");
    expect(get.body.bio).toBe(prevBio);
  });
});

describe("GET /api/user/me — «кто я сейчас»", () => {
  it("TC-PROF-08: краткая карточка аккаунта с профилем", async () => {
    const res = await request(app).get("/api/user/me").set(auth(aliceToken));
    expect(res.status).toBe(200);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.username).toBeTruthy();
    expect(res.body.createdAt).toBeTruthy();
    expect(res.body.profile).toBeTruthy();
  });
});
