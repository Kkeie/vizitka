/**
 * Публичная витрина по адресу /api/public/:username (TC-PUBLIC-01 … TC-PUBLIC-04).
 * Объяснение простым языком — docs/TESTS-EXPLAINED.md.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth } from "./helpers";

let publicUsername: string;

beforeAll(async () => {
  const s = Date.now();
  publicUsername = `alice_pub_${s}`;
  const { status, token } = await register(app, publicUsername, "password123");
  expect(status).toBe(200);
  await request(app)
    .patch("/api/profile/")
    .set(auth(token))
    .send({
      name: "Alice Public",
      bio: "Описание для публичной страницы",
    });
  await request(app)
    .post("/api/blocks/")
    .set(auth(token))
    .send({ type: "note", note: "Публичный блок" });
});

describe("GET /api/public/:username — витрина для гостей", () => {
  it("TC-PUBLIC-01: без входа видно имя, описание, блоки и настройки сетки", async () => {
    const res = await request(app).get(`/api/public/${publicUsername}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBeTruthy();
    expect(res.body).toHaveProperty("bio");
    expect(res.body).toHaveProperty("avatarUrl");
    expect(Array.isArray(res.body.blocks)).toBe(true);
    expect(res.body).toHaveProperty("layout");
    expect(res.body).toHaveProperty("blockSizes");
  });

  it("TC-PUBLIC-02: выдуманный ник — честный 404 not_found", async () => {
    const res = await request(app).get("/api/public/no_such_user_xyz_12345_impossible");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("TC-PUBLIC-03: в ответе нет следов пароля (passwordHash)", async () => {
    const res = await request(app).get(`/api/public/${publicUsername}`);
    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw.toLowerCase()).not.toContain("passwordhash");
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("TC-PUBLIC-04: витрина специально публичная — снова 200 без каких-либо заголовков", async () => {
    const res = await request(app).get(`/api/public/${publicUsername}`);
    expect(res.status).toBe(200);
  });
});
