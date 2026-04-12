/**
 * Выполняется до импорта тестов: изолированная БД, JWT, каталог загрузок.
 */
import fs from "fs";
import path from "path";
import os from "os";

const dbPath = path.join(os.tmpdir(), `bento-test-${process.pid}-${Date.now()}.sqlite`);
try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
} catch {
  /* ignore */
}

const uploadDir = path.join(os.tmpdir(), `bento-uploads-${process.pid}-${Date.now()}`);
fs.mkdirSync(uploadDir, { recursive: true });

process.env.DATABASE_PATH = dbPath;
process.env.JWT_SECRET = "test-jwt-secret-key-min-32-chars-long!!";
process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = uploadDir;
