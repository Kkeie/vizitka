import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Путь к БД
// На Render используем /tmp (доступная директория для записи)
// В Docker будет /app/data/db.sqlite
// Локально будет ./data/db.sqlite
function getDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  
  // На Render (production без Docker) используем /tmp
  if (process.env.NODE_ENV === 'production' && !process.env.DOCKER) {
    return '/tmp/bento-db.sqlite';
  }
  
  // В Docker или локально используем ./data/db.sqlite
  return path.join(process.cwd(), "data", "db.sqlite");
}

let dbPath = getDbPath();
let dbDir = path.dirname(dbPath);

// Пытаемся создать директорию, если не получается - используем /tmp
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (error: any) {
  // Если не удалось создать директорию, пробуем использовать /tmp
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    console.warn(`[DB] Cannot create directory ${dbDir}, using /tmp instead`);
    dbPath = '/tmp/bento-db.sqlite';
    dbDir = path.dirname(dbPath);
    // /tmp всегда существует, не нужно создавать
  } else {
    throw error;
  }
}

// Создаем и экспортируем базу данных
// Используем any для обхода проблемы с типизацией better-sqlite3
let db: any;
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
      backgroundUrl TEXT,
      userId INTEGER NOT NULL UNIQUE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
  
  // Добавляем поле backgroundUrl если его нет (миграция)
  try {
    db.exec(`ALTER TABLE Profile ADD COLUMN backgroundUrl TEXT`);
  } catch (e: any) {
    // Игнорируем ошибку если колонка уже существует
    if (!e.message?.includes('duplicate column')) {
      console.warn('[DB] Could not add backgroundUrl column:', e.message);
    }
  }

  // Добавляем поля контактов если их нет (миграция)
  try {
    db.exec(`ALTER TABLE Profile ADD COLUMN phone TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('[DB] Could not add phone column:', e.message);
    }
  }

  try {
    db.exec(`ALTER TABLE Profile ADD COLUMN email TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('[DB] Could not add email column:', e.message);
    }
  }

  try {
    db.exec(`ALTER TABLE Profile ADD COLUMN telegram TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('[DB] Could not add telegram column:', e.message);
    }
  }

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

  // Добавляем поля для блока соцсетей если их нет (миграция)
  try {
    db.exec(`ALTER TABLE Block ADD COLUMN socialType TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('[DB] Could not add socialType column:', e.message);
    }
  }

  try {
    db.exec(`ALTER TABLE Block ADD COLUMN socialUrl TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('[DB] Could not add socialUrl column:', e.message);
    }
  }

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
  backgroundUrl: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
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
  socialType: string | null;
  socialUrl: string | null;
}

// Закрываем соединение при выходе
process.on("beforeExit", () => {
  db.close();
});
