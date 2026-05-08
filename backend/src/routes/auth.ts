import { Router } from "express";
import { db } from "../utils/db";
import { hashPassword, verifyPassword, signToken, requireAuth, AuthedRequest } from "../utils/auth";
import { findAvailableUsernames, isValidUsernameFormat  } from '../utils/usernameGenerator';
import { RESERVED_USERNAMES } from "../constants";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * { username, email, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };
    console.log("[REGISTER] Attempt:", {
      username: username?.substring(0, 3) + "***",
      email: email?.substring(0, 3) + "***",
    });
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username_email_and_password_required" });
    }
    const uname = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (uname.length < 3) return res.status(400).json({ error: "username_too_short" });
    if (!isValidUsernameFormat(uname)) {
      return res.status(400).json({ error: "invalid_username_format", message: "Only latin letters, numbers and underscore are allowed" });
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: "invalid_email_format" });
    }
    if (password.length < 4) return res.status(400).json({ error: "password_too_short" });

    // Если имя зарезервировано – генерируем предложения и отвечаем как при занятом
    if (RESERVED_USERNAMES.includes(uname)) {
      const suggestions = await findAvailableUsernames(db, uname, 42);
      return res.status(409).json({
        error: "username_taken",
        message: "This username is reserved",
        suggestions,
      });
    }

    // Проверяем существование username
    console.log("[REGISTER] Checking existing username:", uname);
    const existingProfile = db.prepare("SELECT id FROM Profile WHERE username = ?").get(uname);
    if (existingProfile) {
      console.log("[REGISTER] Username already taken:", uname);
      const suggestions = await findAvailableUsernames(db, uname, 42);
      return res.status(409).json({
        error: "username_taken",
        suggestions,
      });
    }

    const existingUserByEmail = db
      .prepare("SELECT id FROM User WHERE email = ? COLLATE NOCASE")
      .get(normalizedEmail);
    if (existingUserByEmail) {
      return res.status(409).json({ error: "email_taken" });
    }

    const passwordHash = await hashPassword(password);

     // Создаем пользователя и профиль в транзакции
     const insertUser = db.prepare("INSERT INTO User (email, passwordHash) VALUES (?, ?)");
     const insertProfile = db.prepare("INSERT INTO Profile (username, name, email, userId) VALUES (?, ?, ?, ?)");
     const selectUser = db.prepare("SELECT createdAt FROM User WHERE id = ?");
     
     const transaction = db.transaction(() => {
       const userResult = insertUser.run(normalizedEmail, passwordHash);
       const userId = userResult.lastInsertRowid as number;
       const profileResult = insertProfile.run(uname, uname, normalizedEmail, userId);
       const profileId = profileResult.lastInsertRowid as number;
       const user = selectUser.get(userId) as { createdAt: string };
       
       return {
         userId,
         profileId,
         username: uname,
         createdAt: user.createdAt,
       };
     });

    const result = transaction();
    console.log("[REGISTER] Success:", { userId: result.userId, username: uname });

    const token = signToken({
      id: result.userId,
      username: uname,
      userCreatedAt: result.createdAt,
      passwordHash,
    });
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
    console.error("[REGISTER] Error:", e);
    console.error("[REGISTER] Error stack:", e instanceof Error ? e.stack : "No stack");
    res.status(500).json({ error: "internal_error", message: e instanceof Error ? e.message : String(e) });
  }
});

/**
 * POST /api/auth/login
 * { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: "invalid_email_format" });
    }

    // Получаем пользователя с профилем по email
    const profile = db.prepare(`
      SELECT p.*, u.id as userId, u.passwordHash, u.createdAt as userCreatedAt
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE u.email = ? COLLATE NOCASE
    `).get(normalizedEmail) as any;

    if (!profile || !profile.passwordHash) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await verifyPassword(password, profile.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = signToken({
      id: profile.userId,
      username: profile.username,
      userCreatedAt: profile.userCreatedAt,
      passwordHash: profile.passwordHash,
    });
    res.json({
      token,
      user: {
        id: profile.userId,
        username: profile.username,
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

/**
 * POST /api/auth/check-username
 * { username }
 */
router.post("/check-username", async (req, res) => {
  const { username } = req.body as { username?: string };
  if (!username) return res.status(400).json({ error: "username_required" });

  const raw = username.trim();
  if (raw.length < 3) {
    return res.status(400).json({ error: "username_too_short" });
  }

  const normalized = raw.toLowerCase();
  const isValidFormat = /^[a-z0-9_]+$/.test(normalized);
  
  // Если формат правильный и имя не зарезервировано – проверяем, свободно ли оно
  if (isValidFormat && !RESERVED_USERNAMES.includes(normalized)) {
    const existing = db.prepare("SELECT id FROM Profile WHERE username = ?").get(normalized);
    if (!existing) {
      return res.json({ available: true, suggestions: [] });
    }
  }
  
  // Во всех остальных случаях (неправильный формат, зарезервировано, занято)
  // генерируем предложения на основе исходного ввода (с поддержкой кириллицы и т.д.)
  const suggestions = await findAvailableUsernames(db, raw, 42);
  return res.json({ available: false, suggestions });
});

/**
 * POST /api/auth/check-email
 * { email }
 */
router.post("/check-email", (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email_required" });

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "invalid_email_format" });
  }

  const existing = db
    .prepare("SELECT id FROM User WHERE email = ? COLLATE NOCASE")
    .get(normalizedEmail);

  return res.json({ available: !existing });
});

router.post("/change-password", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "current_password_and_new_password_required" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "new_password_too_short" });
    }

    const userId = req.user!.id;
    const user = db.prepare("SELECT id, passwordHash, createdAt FROM User WHERE id = ?").get(userId) as any;
    if (!user) return res.status(404).json({ error: "user_not_found" });

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: "invalid_current_password" });

    const newHash = await hashPassword(newPassword);
    db.prepare("UPDATE User SET passwordHash = ? WHERE id = ?").run(newHash, userId);

    // Получаем username для нового токена
    const profile = db.prepare("SELECT username FROM Profile WHERE userId = ?").get(userId) as any;
    const username = profile?.username || req.user!.username;

    const newToken = signToken({
      id: userId,
      username,
      userCreatedAt: user.createdAt,
      passwordHash: newHash,
    });

    res.json({ ok: true, token: newToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
