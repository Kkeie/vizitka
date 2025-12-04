import { Router } from "express";
import { db } from "../utils/db";
import { hashPassword, verifyPassword, signToken } from "../utils/auth";

const router = Router();

/**
 * POST /api/auth/register
 * { username, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) return res.status(400).json({ error: "username_and_password_required" });
    const uname = username.trim().toLowerCase();
    if (uname.length < 3) return res.status(400).json({ error: "username_too_short" });
    if (password.length < 4) return res.status(400).json({ error: "password_too_short" });

    // Проверяем существование username
    const existingProfile = db.prepare("SELECT id FROM Profile WHERE username = ?").get(uname);
    if (existingProfile) return res.status(409).json({ error: "username_taken" });

    const passwordHash = await hashPassword(password);

    // Создаем пользователя и профиль в транзакции
    const insertUser = db.prepare("INSERT INTO User (email, passwordHash) VALUES (?, ?)");
    const insertProfile = db.prepare("INSERT INTO Profile (username, name, userId) VALUES (?, ?, ?)");
    
    const transaction = db.transaction(() => {
      const userResult = insertUser.run(`${uname}@local`, passwordHash);
      const userId = userResult.lastInsertRowid as number;
      const profileResult = insertProfile.run(uname, uname, userId);
      const profileId = profileResult.lastInsertRowid as number;
      
      return {
        userId,
        profileId,
        username: uname,
        createdAt: new Date().toISOString(),
      };
    });

    const result = transaction();

    const token = signToken({ id: result.userId, username: uname });
    res.json({
      token,
      user: {
        id: result.userId,
        username: uname,
        createdAt: result.createdAt,
        profile: {
          id: result.profileId,
          username: uname,
          name: uname,
          bio: null,
          userId: result.userId,
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/auth/login
 * { username, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) return res.status(400).json({ error: "username_and_password_required" });
    const uname = username.trim().toLowerCase();

    // Получаем профиль с пользователем
    const profile = db.prepare(`
      SELECT p.*, u.id as userId, u.passwordHash, u.createdAt as userCreatedAt
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE p.username = ?
    `).get(uname) as any;

    if (!profile || !profile.passwordHash) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await verifyPassword(password, profile.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signToken({ id: profile.userId, username: uname });
    res.json({
      token,
      user: {
        id: profile.userId,
        username: uname,
        createdAt: profile.userCreatedAt,
        profile: {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          bio: profile.bio,
          userId: profile.userId,
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
