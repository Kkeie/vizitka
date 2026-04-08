import { Router } from "express";
import { db } from "../utils/db";
import { requireAuth, type AuthedRequest } from "../utils/auth";

const router = Router();
router.use(requireAuth);

function parseProfileJsonFields(profile: any) {
  if (!profile) return profile;

  const normalized = { ...profile };

  if (normalized.layout) {
    try {
      normalized.layout = JSON.parse(normalized.layout);
    } catch {
      normalized.layout = null;
    }
  } else {
    normalized.layout = null;
  }

  if (normalized.blockSizes) {
    try {
      normalized.blockSizes = JSON.parse(normalized.blockSizes);
    } catch {
      normalized.blockSizes = null;
    }
  } else {
    normalized.blockSizes = null;
  }

  return normalized;
}

// GET /api/profile
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const username = req.user!.username;
  
  // Проверяем, что пользователь существует
  const user = db.prepare("SELECT id FROM User WHERE id = ?").get(userId) as any;
  if (!user) {
    console.error(`[PROFILE] User ${userId} not found in database`);
    return res.status(401).json({ error: "user_not_found", message: "User does not exist in database" });
  }
  
  let profile = db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId) as any;
  
  // Если профиль не существует, создаем его автоматически
  if (!profile) {
    console.log(`[PROFILE] Profile not found for user ${userId}, creating new profile with username: ${username}`);
    try {
      const insert = db.prepare("INSERT INTO Profile (userId, username, name) VALUES (?, ?, ?)");
      insert.run(userId, username, username);
      profile = db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId) as any;
      console.log(`[PROFILE] Profile created successfully:`, profile);
    } catch (e: any) {
      console.error(`[PROFILE] Failed to create profile:`, e);
      // Если username уже занят, используем userId как username
      const fallbackUsername = `user${userId}`;
      const insert = db.prepare("INSERT INTO Profile (userId, username, name) VALUES (?, ?, ?)");
      insert.run(userId, fallbackUsername, fallbackUsername);
      profile = db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId) as any;
    }
  }
  
  if (!profile) {
    console.error(`[PROFILE] Failed to get or create profile for user ${userId}`);
    return res.status(500).json({ error: "profile_creation_failed", message: "Failed to create profile" });
  }

  res.json(parseProfileJsonFields(profile));
});

// PATCH /api/profile
router.patch("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const { username, name, bio, avatarUrl, backgroundUrl, phone, email, telegram, layout, blockSizes } = req.body || {};
  
  // Проверяем, что пользователь существует
  const user = db.prepare("SELECT id FROM User WHERE id = ?").get(userId) as any;
  if (!user) {
    console.error(`[PROFILE] User ${userId} not found in database`);
    return res.status(401).json({ error: "user_not_found", message: "User does not exist in database" });
  }
  
  // Строим UPDATE запрос динамически
  const updates: string[] = [];
  const values: any[] = [];
  
  // Обработка username с нормализацией
  if (username !== undefined) {
    const normalized = username.trim().toLowerCase();
    
    if (normalized.length < 3) {
      return res.status(400).json({ error: "username_too_short", message: "Username must be at least 3 characters" });
    }
    
    // Проверка уникальности
    const exists = db.prepare("SELECT id, userId FROM Profile WHERE username = ?").get(normalized) as any;
    if (exists && exists.userId !== userId) {
      return res.status(400).json({ error: "username_taken", message: "Username already taken" });
    }
    
    updates.push("username = ?");
    values.push(normalized);
  }
  
  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }
  if (bio !== undefined) {
    updates.push("bio = ?");
    values.push(bio);
  }
  if (avatarUrl !== undefined) {
    updates.push("avatarUrl = ?");
    values.push(avatarUrl);
  }
  if (backgroundUrl !== undefined) {
    updates.push("backgroundUrl = ?");
    values.push(backgroundUrl);
  }
  if (phone !== undefined) {
    updates.push("phone = ?");
    values.push(phone);
  }
  if (email !== undefined) {
    updates.push("email = ?");
    values.push(email);
  }
  if (telegram !== undefined) {
    updates.push("telegram = ?");
    values.push(telegram);
  }
  if (layout !== undefined) {
    updates.push("layout = ?");
    values.push(JSON.stringify(layout));
  }
  if (blockSizes !== undefined) {
    updates.push("blockSizes = ?");
    values.push(JSON.stringify(blockSizes));
  }
  
  if (updates.length > 0) {
    values.push(userId);
    const update = db.prepare(`UPDATE Profile SET ${updates.join(", ")} WHERE userId = ?`);
    update.run(...values);
  }
  
  const updated = db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId) as any;
  res.json(parseProfileJsonFields(updated));
});

export default router;
