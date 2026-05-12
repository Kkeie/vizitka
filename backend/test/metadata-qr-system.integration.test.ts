/**
 * TC-META-01…03, TC-QR-01…02, TC-SYS-01…04 — см. docs/TESTS-EXPLAINED.md
 * Ниже — дополнительные проверки с «человеческими» названиями.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("GET /api/metadata — превью ссылок для редактора", () => {
  it(
    "TC-META-01: по обычному https-адресу приходит JSON с полем url (страница существует)",
    async () => {
      const res = await request(app).get("/api/metadata").query({ url: "https://example.com" });
      expect(res.status).toBe(200);
      expect(res.body.url).toBeTruthy();
    },
    25_000
  );

  it("TC-META-02: если забыли передать ссылку — сервер честно пишет, что параметр url нужен", async () => {
    const res = await request(app).get("/api/metadata");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "url_required" });
  });

  it("TC-META-03: строка «не похожа на адрес» — ошибка invalid_url", async () => {
    const res = await request(app).get("/api/metadata").query({ url: "not-a-url" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid_url" });
  });

  it("другой рабочий сайт (example.org) — тоже 200 и есть поле url", async () => {
    const res = await request(app).get("/api/metadata").query({ url: "https://example.org" });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/example\.org/i);
  }, 25_000);
});

describe("GET /api/qr — картинка со штрихкодом для печати или экрана", () => {
  it("TC-QR-01: для ссылки получаем настоящий PNG, не пустой файл", async () => {
    const res = await request(app).get("/api/qr").query({ url: "https://example.com" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
    expect(Buffer.isBuffer(res.body) ? res.body.length : res.body.byteLength).toBeGreaterThan(0);
  });

  it("TC-QR-02: без адреса — ошибка missing_url", async () => {
    const res = await request(app).get("/api/qr");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "missing_url" });
  });

  it("длинная ссылка с параметрами — всё равно строится QR", async () => {
    const res = await request(app)
      .get("/api/qr")
      .query({ url: "https://example.com/path?q=1&x=hello" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
  });
});

describe("Сервис «жив ли сервер» и безопасность токена", () => {
  it("TC-SYS-01: health говорит ok: true — фронт может показать «всё работает»", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("TC-SYS-02: выдуманный путь /api/... даёт JSON-ошибку 404, не HTML", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("TC-SYS-03: если в теле запроса битый JSON — ответ тоже JSON с ошибкой разбора", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{invalid json body");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_json");
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("TC-SYS-04: поддельный токен не открывает /api/user/me", async () => {
    const res = await request(app)
      .get("/api/user/me")
      .set({ Authorization: "Bearer invalid.token.value" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthorized" });
  });

  it("заголовок Authorization без слова Bearer — как без пропуска", async () => {
    const res = await request(app).get("/api/user/me").set({ Authorization: "just-a-string" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/health/mail — наличие переменных для почты (без секретов в ответе)", () => {
  it("200 и набор булевых флагов", async () => {
    const res = await request(app).get("/api/health/mail");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      smtpHostSet: expect.any(Boolean),
      smtpAuthSet: expect.any(Boolean),
      emailFromSet: expect.any(Boolean),
      verificationLinkBaseSet: expect.any(Boolean),
      readyToSend: expect.any(Boolean),
    });
  });
});
