import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Путь к БД (в Docker будет /app/data/db.sqlite)
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "db.sqlite");
const dbDir = path.dirname(dbPath);

// Создаем директорию если её нет
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database;
try {
  console.log(`[DB] Attempting to open database at: ${dbPath}`);
  db = new Database(dbPath);
  console.log(`[DB] Database opened successfully`);
} catch (error) {
  console.error(`[DB] Failed to open database at ${dbPath}:`, error);
  throw error;
}

export { db };

// Включаем foreign keys
db.pragma("foreign_keys = ON");

// Инициализация схемы БД
export function initDatabase() {
  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица профилей
  db.exec(`
    CREATE TABLE IF NOT EXISTS Profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT,
      bio TEXT,
      avatarUrl TEXT,
      userId INTEGER NOT NULL UNIQUE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);

  // Таблица блоков
  db.exec(`
    CREATE TABLE IF NOT EXISTS Block (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL,
      sort INTEGER DEFAULT 0,
      note TEXT,
      linkUrl TEXT,
      photoUrl TEXT,
      videoUrl TEXT,
      musicEmbed TEXT,
      mapLat REAL,
      mapLng REAL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);

  // Индексы для производительности
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_block_userId ON Block(userId);
    CREATE INDEX IF NOT EXISTS idx_block_sort ON Block(userId, sort);
    CREATE INDEX IF NOT EXISTS idx_profile_username ON Profile(username);
    CREATE INDEX IF NOT EXISTS idx_profile_userId ON Profile(userId);
  `);

  // Триггер для обновления updatedAt
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_block_timestamp 
    AFTER UPDATE ON Block
    BEGIN
      UPDATE Block SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);
}

// Инициализируем БД при импорте
try {
  initDatabase();
  console.log("[DB] Database initialized successfully at:", dbPath);
} catch (error) {
  console.error("[DB] Failed to initialize database:", error);
  throw error;
}

// Типы для TypeScript
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Profile {
  id: number;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  userId: number;
}

export interface Block {
  id: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
  type: string;
  sort: number;
  note: string | null;
  linkUrl: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  musicEmbed: string | null;
  mapLat: number | null;
  mapLng: number | null;
}

// Закрываем соединение при выходе
process.on("beforeExit", () => {
  db.close();
});
