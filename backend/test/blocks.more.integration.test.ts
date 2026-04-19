/**
 * Карточки (блоки): дополнительные сценарии поверх базового файла blocks.integration.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth, uniqueName } from "./helpers";

let token: string;

beforeAll(async () => {
  const u = uniqueName("blk_more");
  const r = await register(app, u, "password123");
  expect(r.status).toBe(200);
  token = r.token;
});

describe("Список блоков — порядок и целостность", () => {
  it("каждый блок в списке имеет числовой id и не повторяется в одном ответе", async () => {
    const res = await request(app).get("/api/blocks/").set(auth(token));
    expect(res.status).toBe(200);
    const ids = (res.body as { id: number }[]).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("POST с пустым объектом {} — нет типа карточки, сервер просит указать type", async () => {
    const res = await request(app).post("/api/blocks/").set(auth(token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("type_required");
  });
});

describe("Создание разных типов карточек подряд", () => {
  it("две заметки подряд — обе появляются в списке с разными id", async () => {
    const u = uniqueName("two_notes");
    const { token: t } = await register(app, u, "password123");
    const a = await request(app)
      .post("/api/blocks/")
      .set(auth(t))
      .send({ type: "note", note: "Первая" });
    const b = await request(app)
      .post("/api/blocks/")
      .set(auth(t))
      .send({ type: "note", note: "Вторая" });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.id).not.toBe(b.body.id);
    const list = await request(app).get("/api/blocks/").set(auth(t));
    const ids = (list.body as { id: number }[]).map((x) => x.id);
    expect(ids).toContain(a.body.id);
    expect(ids).toContain(b.body.id);
  });

  it("ссылка с полем url вместо linkUrl — сервер понимает синоним", async () => {
    const u = uniqueName("link_alias");
    const { token: t } = await register(app, u, "password123");
    const res = await request(app)
      .post("/api/blocks/")
      .set(auth(t))
      .send({ type: "link", url: "https://open.example.org/page" });
    expect(res.status).toBe(200);
    expect(res.body.linkUrl).toContain("open.example.org");
  });
});

describe("Переупорядочивание из трёх блоков", () => {
  it("три заметки: меняем порядок так, что средняя становится первой по sort", async () => {
    const u = uniqueName("re3");
    const { token: t } = await register(app, u, "password123");
    const b0 = await request(app)
      .post("/api/blocks/")
      .set(auth(t))
      .send({ type: "note", note: "A", sort: 0 });
    const b1 = await request(app)
      .post("/api/blocks/")
      .set(auth(t))
      .send({ type: "note", note: "B", sort: 1 });
    const b2 = await request(app)
      .post("/api/blocks/")
      .set(auth(t))
      .send({ type: "note", note: "C", sort: 2 });
    const id0 = b0.body.id as number;
    const id1 = b1.body.id as number;
    const id2 = b2.body.id as number;
    await request(app)
      .post("/api/blocks/reorder")
      .set(auth(t))
      .send({
        items: [
          { id: id0, sort: 2 },
          { id: id1, sort: 0 },
          { id: id2, sort: 1 },
        ],
      });
    const list = await request(app).get("/api/blocks/").set(auth(t));
    const byId = Object.fromEntries((list.body as { id: number; sort: number }[]).map((x) => [x.id, x.sort]));
    expect(byId[id1]).toBe(0);
    expect(byId[id2]).toBe(1);
    expect(byId[id0]).toBe(2);
  });
});

describe("Чужие данные недоступны", () => {
  it("нельзя прочитать список блоков другого пользователя, даже зная числовой id", async () => {
    const u1 = uniqueName("owner");
    const u2 = uniqueName("other");
    const a = await register(app, u1, "password123");
    const b = await register(app, u2, "password123");
    const block = await request(app)
      .post("/api/blocks/")
      .set(auth(a.token))
      .send({ type: "note", note: "Секрет" });
    const tryPatch = await request(app)
      .patch(`/api/blocks/${block.body.id}`)
      .set(auth(b.token))
      .send({ note: "Взлом" });
    expect(tryPatch.status).toBe(404);
  });
});
