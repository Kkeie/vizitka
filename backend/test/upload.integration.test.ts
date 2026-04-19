/**
 * Загрузка файлов и отдача по /uploads (TC-UPLOAD, TC-SYS-05).
 * См. docs/TESTS-EXPLAINED.md.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "path";
import app from "../src/app";
import { register, auth } from "./helpers";

/** Минимальный валидный JPEG 1×1 */
const JPEG_1X1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Af//Z",
  "base64"
);

describe("POST /api/storage/* — загрузить файл в своё хранилище", () => {
  it("TC-UPLOAD-01: маленькая JPEG — в ответе ссылка, по ссылке отдаётся картинка", async () => {
    const u = await register(app, `up_jpg_${Date.now()}`, "password123");
    expect(u.status).toBe(200);
    const post = await request(app)
      .post("/api/storage/image")
      .set(auth(u.token))
      .attach("image", JPEG_1X1, "photo.jpg");
    expect(post.status).toBe(200);
    expect(post.body.url).toBeTruthy();
    const url = post.body.url as string;
    const pathname = url.startsWith("http") ? new URL(url).pathname : url;
    const get = await request(app).get(pathname);
    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toMatch(/image\/jpeg/);
  });

  it("TC-UPLOAD-03: загрузка видео-файла — приходит url", async () => {
    const u = await register(app, `up_vid_${Date.now()}`, "password123");
    const tinyMp4 = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, 0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65,
    ]);
    const post = await request(app)
      .post("/api/storage/video")
      .set(auth(u.token))
      .attach("video", tinyMp4, "clip.mp4");
    expect(post.status).toBe(200);
    expect(post.body.url).toBeTruthy();
  });

  it("TC-UPLOAD-04: загрузка аудио — приходит url", async () => {
    const u = await register(app, `up_aud_${Date.now()}`, "password123");
    const id3 = Buffer.from("ID3\x03\x00\x00\x00\x00\x00\x22TSSE\x00\x00\x00\x0f\x00\x00\x03fake\x00", "ascii");
    const post = await request(app)
      .post("/api/storage/audio")
      .set(auth(u.token))
      .attach("audio", id3, "track.mp3");
    expect(post.status).toBe(200);
    expect(post.body.url).toBeTruthy();
  });

  it("TC-UPLOAD-05: гость не может грузить картинку — 401", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const res = await request(app).post("/api/storage/image").attach("image", png, "x.png");
    expect(res.status).toBe(401);
  });

  it("TC-UPLOAD-06: текстовый файл под видом загрузки — отказ (не тот тип)", async () => {
    const u = await register(app, `up_bad_${Date.now()}`, "password123");
    const res = await request(app)
      .post("/api/storage/upload")
      .set(auth(u.token))
      .attach("file", Buffer.from("hello"), { filename: "document.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    expect(String(res.body.error || "").toLowerCase()).toMatch(/unsupported|upload/);
  });

  it(
    "TC-UPLOAD-07: слишком большой файл — 413 file_too_large",
    async () => {
      const u = await register(app, `up_huge_${Date.now()}`, "password123");
      const big = Buffer.alloc(50 * 1024 * 1024 + 1024, 0xff);
      const res = await request(app)
        .post("/api/storage/image")
        .set(auth(u.token))
        .attach("image", big, "huge.jpg");
      expect(res.status).toBe(413);
      expect(res.body).toEqual({ error: "file_too_large" });
    },
    120_000
  );
});

describe("Статика /uploads — раздать загруженный файл по прямой ссылке", () => {
  it("TC-SYS-05: после POST файл реально читается отдельным GET", async () => {
    const u = await register(app, `sys5_${Date.now()}`, "password123");
    const post = await request(app)
      .post("/api/storage/image")
      .set(auth(u.token))
      .attach("image", JPEG_1X1, "z.jpg");
    expect(post.status).toBe(200);
    const url = post.body.url as string;
    const pathname = url.startsWith("http") ? new URL(url).pathname : url;
    expect(pathname.startsWith("/uploads/")).toBe(true);
    const filename = path.basename(pathname);
    const get = await request(app).get(`/uploads/${filename}`);
    expect(get.status).toBe(200);
    expect(get.body.length).toBeGreaterThan(0);
  });
});
