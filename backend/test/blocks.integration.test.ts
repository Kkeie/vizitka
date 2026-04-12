/**
 * Интеграционные тесты карточек (блоков): создание по типам, список, PATCH, DELETE, reorder,
 * изоляция пользователей, цепочка «загрузка изображения → блок photo».
 *
 * Поведение API (зафиксировано тестами, не правки кода):
 * - DELETE чужого блока возвращает 200 { ok: true }, строк в БД не удаляет.
 * - Сервер не хранит «сессию браузера»: без заголовка Authorization защищённые маршруты дают 401
 *   (автовход на «другом устройстве» без токена невозможен на уровне API).
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth } from "./helpers";

/** Минимальный валидный PNG 1×1 */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

let userA: { token: string; username: string };
let userB: { token: string; username: string };

beforeAll(async () => {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const a = await register(app, `tc_a_${suffix}`);
  const b = await register(app, `tc_b_${suffix}`);
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  userA = { token: a.token, username: `tc_a_${suffix}` };
  userB = { token: b.token, username: `tc_b_${suffix}` };
});

describe("POST /api/blocks — создание карточек", () => {
  it("401 без Authorization", async () => {
    const res = await request(app).post("/api/blocks/").send({ type: "note", note: "x" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  /** TC-BLOCK-07 */
  it("400 если не передан type", async () => {
    const res = await request(app)
      .post("/api/blocks/")
      .set(auth(userA.token))
      .send({ note: "Без типа" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("type_required");
  });

  describe("тип note", () => {
    /** TC-BLOCK-02 */
    it("поле note", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "note", note: "Это текстовый блок" });
      expect(res.status).toBe(200);
      expect(res.body.type).toBe("note");
      expect(res.body.note).toBe("Это текстовый блок");
      expect(res.body.sort).toBe(0);
      const list = await request(app).get("/api/blocks/").set(auth(userA.token));
      expect(list.status).toBe(200);
      expect(
        (list.body as { id: number; note?: string }[]).some(
          (b) => b.id === res.body.id && b.note === "Это текстовый блок"
        )
      ).toBe(true);
    });

    it("поле content (алиас)", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "note", content: "Контент через content" });
      expect(res.status).toBe(200);
      expect(res.body.note).toBe("Контент через content");
    });

    it("noteStyle (валидные поля)", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({
          type: "note",
          note: "Стили",
          noteStyle: {
            align: "center",
            backgroundColor: "#ff0000",
            textColor: "#ffffff",
            fontFamily: "mono",
            bold: true,
            italic: false,
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.noteStyle).toMatchObject({
        align: "center",
        backgroundColor: "#ff0000",
        textColor: "#ffffff",
        fontFamily: "mono",
        bold: true,
        italic: false,
      });
    });

    it("noteStyle: невалидный hex для фона отбрасывается", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({
          type: "note",
          note: "Частичные стили",
          noteStyle: {
            align: "left",
            backgroundColor: "not-a-hex",
            textColor: "#abc",
            fontFamily: "serif",
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.noteStyle?.align).toBe("left");
      expect(res.body.noteStyle?.fontFamily).toBe("serif");
      expect(res.body.noteStyle?.textColor).toBe("#abc");
      expect(res.body.noteStyle?.backgroundColor).toBeUndefined();
    });

    it("явный sort", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "note", note: "С порядком", sort: 42 });
      expect(res.status).toBe(200);
      expect(res.body.sort).toBe(42);
    });
  });

  describe("тип section", () => {
    it("content", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "section", content: "Заголовок секции" });
      expect(res.status).toBe(200);
      expect(res.body.type).toBe("section");
      expect(res.body.note).toBe("Заголовок секции");
    });

    it("note", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "section", note: "Секция через note" });
      expect(res.status).toBe(200);
      expect(res.body.note).toBe("Секция через note");
    });
  });

  describe("тип link", () => {
    /** TC-BLOCK-03 */
    it("linkUrl", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "link", linkUrl: "https://example.com" });
      expect(res.status).toBe(200);
      expect(res.body.linkUrl).toBe("https://example.com");
    });

    it("url (алиас)", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "link", url: "https://open.example.org" });
      expect(res.status).toBe(200);
      expect(res.body.linkUrl).toBe("https://open.example.org");
    });
  });

  describe("тип photo", () => {
    /** TC-BLOCK-04 */
    it("photoUrl", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "photo", photoUrl: "/uploads/test.jpg" });
      expect(res.status).toBe(200);
      expect(res.body.photoUrl).toBe("/uploads/test.jpg");
    });

    it("url (алиас)", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "photo", url: "https://cdn.example.com/img.png" });
      expect(res.status).toBe(200);
      expect(res.body.photoUrl).toBe("https://cdn.example.com/img.png");
    });
  });

  describe("тип video", () => {
    it("videoUrl", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "video", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
      expect(res.status).toBe(200);
      expect(res.body.videoUrl).toContain("youtube.com");
    });

    it("url (алиас)", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "video", url: "https://vimeo.com/12345" });
      expect(res.status).toBe(200);
      expect(res.body.videoUrl).toBe("https://vimeo.com/12345");
    });
  });

  describe("тип music", () => {
    it("musicEmbed", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "music", musicEmbed: "https://open.spotify.com/track/abc" });
      expect(res.status).toBe(200);
      expect(res.body.musicEmbed).toContain("spotify");
    });

    it("url (алиас)", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "music", url: "https://music.yandex.ru/album/1" });
      expect(res.status).toBe(200);
      expect(res.body.musicEmbed).toBe("https://music.yandex.ru/album/1");
    });
  });

  describe("тип map", () => {
    /** TC-BLOCK-05 */
    it("mapLat и mapLng", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "map", mapLat: 55.7558, mapLng: 37.6173 });
      expect(res.status).toBe(200);
      expect(res.body.mapLat).toBe(55.7558);
      expect(res.body.mapLng).toBe(37.6173);
    });

    it("url «lat,lng»", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "map", url: "59.9343, 30.3351" });
      expect(res.status).toBe(200);
      expect(res.body.mapLat).toBeCloseTo(59.9343, 4);
      expect(res.body.mapLng).toBeCloseTo(30.3351, 4);
    });

    it("url без запятой — координаты null", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({ type: "map", url: "no-comma" });
      expect(res.status).toBe(200);
      expect(res.body.mapLat).toBeNull();
      expect(res.body.mapLng).toBeNull();
    });
  });

  describe("тип social", () => {
    /** TC-BLOCK-06 */
    it("telegram", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({
          type: "social",
          socialType: "telegram",
          socialUrl: "https://t.me/example",
        });
      expect(res.status).toBe(200);
      expect(res.body.socialType).toBe("telegram");
      expect(res.body.socialUrl).toBe("https://t.me/example");
    });

    it("github", async () => {
      const res = await request(app)
        .post("/api/blocks/")
        .set(auth(userA.token))
        .send({
          type: "social",
          socialType: "github",
          socialUrl: "https://github.com/octocat",
        });
      expect(res.status).toBe(200);
      expect(res.body.socialType).toBe("github");
    });
  });

  it("неизвестный type сохраняется как есть", async () => {
    const res = await request(app)
      .post("/api/blocks/")
      .set(auth(userA.token))
      .send({ type: "custom_future_type", sort: 1 });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("custom_future_type");
  });
});

describe("GET /api/blocks", () => {
  /** TC-BLOCK-12 */
  it("401 без токена", async () => {
    const res = await request(app).get("/api/blocks/");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  /** TC-BLOCK-01 */
  it("массив блоков: у каждого есть id, type, sort", async () => {
    const res = await request(app).get("/api/blocks/").set(auth(userA.token));
    expect(res.status).toBe(200);
    const blocks = res.body as { id: number; type: string; sort: number }[];
    expect(Array.isArray(blocks)).toBe(true);
    for (const b of blocks) {
      expect(typeof b.id).toBe("number");
      expect(typeof b.type).toBe("string");
      expect(typeof b.sort).toBe("number");
    }
  });

  it("порядок sort ASC, id ASC", async () => {
    const res = await request(app).get("/api/blocks/").set(auth(userA.token));
    expect(res.status).toBe(200);
    const blocks = res.body as { id: number; sort: number }[];
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const cur = blocks[i];
      const ok = prev.sort < cur.sort || (prev.sort === cur.sort && prev.id < cur.id);
      expect(ok).toBe(true);
    }
  });

  /** TC-BLOCK-13 */
  it("изоляция: списки блоков разных пользователей не пересекаются", async () => {
    const aBlocks = await request(app).get("/api/blocks/").set(auth(userA.token));
    const bBlocks = await request(app).get("/api/blocks/").set(auth(userB.token));
    const aIds = new Set((aBlocks.body as { id: number }[]).map((x) => x.id));
    const bIds = new Set((bBlocks.body as { id: number }[]).map((x) => x.id));
    for (const id of bIds) {
      expect(aIds.has(id)).toBe(false);
    }
    for (const id of aIds) {
      expect(bIds.has(id)).toBe(false);
    }
  });
});

describe("Авторизация и «другое устройство» (API)", () => {
  it("GET /api/user/me без заголовка — 401 (нет автологина по cookie на сервере)", async () => {
    const res = await request(app).get("/api/user/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/blocks без заголовка — 401", async () => {
    const res = await request(app).get("/api/blocks/");
    expect(res.status).toBe(401);
  });

  it("невалидный Bearer — 401", async () => {
    const res = await request(app)
      .get("/api/blocks/")
      .set({ Authorization: "Bearer definitely.not.a.jwt" });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/blocks/:id", () => {
  let noteId: number;

  beforeAll(async () => {
    const created = await request(app)
      .post("/api/blocks/")
      .set(auth(userA.token))
      .send({ type: "note", note: "Для патча" });
    noteId = created.body.id;
  });

  it("404 несуществующий id", async () => {
    const res = await request(app)
      .patch("/api/blocks/999999999")
      .set(auth(userA.token))
      .send({ note: "x" });
    expect(res.status).toBe(404);
  });

  /** TC-BLOCK-08 */
  it("обновление note", async () => {
    const res = await request(app)
      .patch(`/api/blocks/${noteId}`)
      .set(auth(userA.token))
      .send({ note: "Обновлённый текст" });
    expect(res.status).toBe(200);
    expect(res.body.note).toBe("Обновлённый текст");
    const list = await request(app).get("/api/blocks/").set(auth(userA.token));
    const row = (list.body as { id: number; note?: string }[]).find((x) => x.id === noteId);
    expect(row?.note).toBe("Обновлённый текст");
  });

  /** TC-BLOCK-09 */
  it("404 PATCH чужого блока; данные владельца не меняются", async () => {
    const before = await request(app).get("/api/blocks/").set(auth(userA.token));
    const beforeNote = (before.body as { id: number; note?: string }[]).find((x) => x.id === noteId)?.note;
    const res = await request(app)
      .patch(`/api/blocks/${noteId}`)
      .set(auth(userB.token))
      .send({ note: "Попытка изменить чужой блок" });
    expect(res.status).toBe(404);
    const after = await request(app).get("/api/blocks/").set(auth(userA.token));
    const afterNote = (after.body as { id: number; note?: string }[]).find((x) => x.id === noteId)?.note;
    expect(afterNote).toBe(beforeNote);
  });

  it("обновление photoUrl у блока photo", async () => {
    const created = await request(app)
      .post("/api/blocks/")
      .set(auth(userA.token))
      .send({ type: "photo", photoUrl: "/uploads/old.jpg" });
    const id = created.body.id as number;
    const res = await request(app)
      .patch(`/api/blocks/${id}`)
      .set(auth(userA.token))
      .send({ photoUrl: "/uploads/new.jpg" });
    expect(res.status).toBe(200);
    expect(res.body.photoUrl).toBe("/uploads/new.jpg");
  });
});

describe("POST /api/blocks/reorder", () => {
  /** TC-BLOCK-11 (как в TEST-CASES: swap sort 0↔1) */
  it("меняет sort: id1→1, id2→0; в списке сначала блок с меньшим sort", async () => {
    const suffix = `${Date.now()}`;
    const u = await register(app, `reorder_${suffix}`);
    expect(u.status).toBe(200);

    const b1 = await request(app)
      .post("/api/blocks/")
      .set(auth(u.token))
      .send({ type: "note", note: "first", sort: 0 });
    const b2 = await request(app)
      .post("/api/blocks/")
      .set(auth(u.token))
      .send({ type: "note", note: "second", sort: 1 });
    const id1 = b1.body.id as number;
    const id2 = b2.body.id as number;

    const reorder = await request(app)
      .post("/api/blocks/reorder")
      .set(auth(u.token))
      .send({ items: [{ id: id1, sort: 1 }, { id: id2, sort: 0 }] });
    expect(reorder.status).toBe(200);
    expect(reorder.body.ok).toBe(true);

    const list = await request(app).get("/api/blocks/").set(auth(u.token));
    const row1 = list.body.find((x: { id: number }) => x.id === id1);
    const row2 = list.body.find((x: { id: number }) => x.id === id2);
    expect(row1.sort).toBe(1);
    expect(row2.sort).toBe(0);
    const blocks = list.body as { id: number; sort: number }[];
    const i1 = blocks.findIndex((x) => x.id === id1);
    const i2 = blocks.findIndex((x) => x.id === id2);
    expect(i2).toBeLessThan(i1);
  });

  it("некорректные id/sort пропускаются, 200", async () => {
    const res = await request(app)
      .post("/api/blocks/reorder")
      .set(auth(userA.token))
      .send({
        items: [
          { id: "not-a-number", sort: 0 },
          { id: 1, sort: "bad" },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("DELETE /api/blocks/:id", () => {
  /** TC-BLOCK-10 */
  it("удаляет свой блок", async () => {
    const suffix = `${Date.now()}`;
    const u = await register(app, `del_${suffix}`);
    const created = await request(app)
      .post("/api/blocks/")
      .set(auth(u.token))
      .send({ type: "note", note: "удалить" });
    const id = created.body.id as number;

    const del = await request(app).delete(`/api/blocks/${id}`).set(auth(u.token));
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const list = await request(app).get("/api/blocks/").set(auth(u.token));
    expect((list.body as { id: number }[]).find((x) => x.id === id)).toBeUndefined();
  });

  it("DELETE чужого блока: ответ 200, запись владельца сохраняется", async () => {
    const created = await request(app)
      .post("/api/blocks/")
      .set(auth(userA.token))
      .send({ type: "note", note: "защита" });
    const id = created.body.id as number;

    const del = await request(app).delete(`/api/blocks/${id}`).set(auth(userB.token));
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const still = await request(app).get("/api/blocks/").set(auth(userA.token));
    expect((still.body as { id: number }[]).find((x) => x.id === id)).toBeDefined();
  });
});

describe("Цепочка: загрузка изображения → блок photo", () => {
  /** TC-UPLOAD-02 (PNG) + интеграция с блоком photo; см. также TC-UPLOAD-05 */
  it("POST /api/storage/image с PNG, затем блок photo с url из ответа", async () => {
    const suffix = `${Date.now()}`;
    const u = await register(app, `up_${suffix}`);
    expect(u.status).toBe(200);

    const up = await request(app)
      .post("/api/storage/image")
      .set(auth(u.token))
      .attach("image", PNG_1X1, "pixel.png");

    expect(up.status).toBe(200);
    const url = up.body.url as string;
    expect(url).toBeTruthy();

    const blockRes = await request(app)
      .post("/api/blocks/")
      .set(auth(u.token))
      .send({ type: "photo", photoUrl: url });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.type).toBe("photo");
    expect(blockRes.body.photoUrl).toBe(url);
  });

  /** TC-UPLOAD-05 */
  it("POST /api/storage/image без токена — 401", async () => {
    const res = await request(app).post("/api/storage/image").attach("image", PNG_1X1, "x.png");
    expect(res.status).toBe(401);
  });
});
