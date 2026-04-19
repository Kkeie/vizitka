/**
 * Загрузка файлов: дополнительные проверки (разные эндпоинты, отказ без входа).
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { register, auth, uniqueName } from "./helpers";

const JPEG_1X1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Af//Z",
  "base64"
);

describe("Загрузки: гость не может подгружать файлы", () => {
  it("видео без токена — сразу отказ (как закрытая дверь)", async () => {
    const tiny = Buffer.alloc(32, 0);
    const res = await request(app).post("/api/storage/video").attach("video", tiny, "x.mp4");
    expect(res.status).toBe(401);
  });

  it("аудио без токена — отказ", async () => {
    const res = await request(app).post("/api/storage/audio").attach("audio", Buffer.from("x"), "x.mp3");
    expect(res.status).toBe(401);
  });

  it("универсальный upload без токена — отказ", async () => {
    const res = await request(app)
      .post("/api/storage/upload")
      .attach("file", JPEG_1X1, "a.jpg");
    expect(res.status).toBe(401);
  });
});

describe("Загрузки: авторизованный пользователь", () => {
  it("картинку можно отправить полем file — сервер всё равно принимает (любое имя поля)", async () => {
    const u = uniqueName("fld");
    const { token } = await register(app, u, "password123");
    const res = await request(app)
      .post("/api/storage/image")
      .set(auth(token))
      .attach("file", JPEG_1X1, "pic.jpg");
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/uploads|jpg/i);
  });

  it("ответ всегда содержит url — по нему потом открывается картинка", async () => {
    const u = uniqueName("urlchk");
    const { token } = await register(app, u, "password123");
    const post = await request(app)
      .post("/api/storage/image")
      .set(auth(token))
      .attach("image", JPEG_1X1, "a.jpg");
    expect(post.body.url).toBeTruthy();
    const path = post.body.url.startsWith("http") ? new URL(post.body.url).pathname : post.body.url;
    const get = await request(app).get(path);
    expect(get.status).toBe(200);
  });
});
