import { Router } from "express";
import { db } from "../utils/db";
import { hashPassword, verifyPassword, signToken, requireAuth, AuthedRequest } from "../utils/auth";
import { findAvailableUsernames, isValidUsernameFormat  } from '../utils/usernameGenerator';
import { RESERVED_USERNAMES } from "../constants";
import { generateVerificationToken, hashVerificationToken } from "../utils/verificationToken";
import { buildEmailVerificationUrl, sendVerificationEmail } from "../utils/mailer";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESEND_VERIFICATION_COOLDOWN_MS = 60_000;
const resendVerificationLastAt = new Map<string, number>();

const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

function issueAuthForUser(userId: number) {
  const row = db.prepare(`
    SELECT u.id, u.email, u.createdAt, u.passwordHash, u.emailVerified, p.id AS profileId,
           p.username, p.name, p.bio, p.userId AS profileUserId
    FROM User u
    JOIN Profile p ON p.userId = u.id
    WHERE u.id = ?
  `).get(userId) as
    | {
        id: number;
        email: string;
        createdAt: string;
        passwordHash: string;
        emailVerified: number | null;
        profileId: number;
        username: string;
        name: string | null;
        bio: string | null;
        profileUserId: number;
      }
    | undefined;

  if (!row || row.emailVerified !== 1) return null;

  const token = signToken({
    id: row.id,
    username: row.username,
    userCreatedAt: row.createdAt,
    passwordHash: row.passwordHash,
  });

  return {
    token,
    user: {
      id: row.id,
      username: row.username,
      createdAt: row.createdAt,
      emailVerified: true,
      profile: {
        id: row.profileId,
        username: row.username,
        name: row.name,
        bio: row.bio,
        userId: row.profileUserId,
      },
    },
  };
}

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
    const rawVerify = generateVerificationToken();
    const verifyHash = hashVerificationToken(rawVerify);
    const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();
    const verifySentAt = new Date().toISOString();

     // Создаем пользователя и профиль в транзакции
     const insertUser = db.prepare(`
       INSERT INTO User (email, passwordHash, emailVerified, emailVerifyTokenHash, emailVerifyExpiresAt, emailVerifySentAt)
       VALUES (?, ?, 0, ?, ?, ?)
     `);
     const insertProfile = db.prepare("INSERT INTO Profile (username, name, email, userId) VALUES (?, ?, ?, ?)");
     const selectUser = db.prepare("SELECT createdAt FROM User WHERE id = ?");
     
     const transaction = db.transaction(() => {
       const userResult = insertUser.run(normalizedEmail, passwordHash, verifyHash, verifyExpires, verifySentAt);
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

    const verifyUrl = buildEmailVerificationUrl(rawVerify);
    // Не ждём SMTP: иначе при зависании соединения с Gmail клиент «вечно» ждёт ответ.
    void sendVerificationEmail(normalizedEmail, verifyUrl).catch((e) => {
      console.error("[REGISTER] Failed to send verification email:", e);
    });

    res.json({
      verificationRequired: true,
      user: {
        id: result.userId,
        username: uname,
        createdAt: result.createdAt,
        emailVerified: false,
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
      SELECT p.*, u.id as userId, u.passwordHash, u.createdAt as userCreatedAt, u.emailVerified
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE u.email = ? COLLATE NOCASE
    `).get(normalizedEmail) as any;

    if (!profile || !profile.passwordHash) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await verifyPassword(password, profile.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    if (profile.emailVerified !== 1) {
      return res.status(403).json({ error: "email_not_verified" });
    }

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
        emailVerified: true,
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

/**
 * POST /api/auth/verify-email
 * { token } — одноразовый токен из письма
 */
router.post("/verify-email", async (req, res) => {
  try {
    const raw = String((req.body as { token?: string })?.token ?? "").trim();
    if (!raw) return res.status(400).json({ error: "token_required" });

    const tokenHash = hashVerificationToken(raw);
    const row = db.prepare(`
      SELECT id, emailVerified, emailVerifyExpiresAt
      FROM User WHERE emailVerifyTokenHash = ?
    `).get(tokenHash) as
      | { id: number; emailVerified: number | null; emailVerifyExpiresAt: string | null }
      | undefined;

    if (!row) return res.status(400).json({ error: "invalid_or_expired_token" });

    if (row.emailVerified !== 1) {
      const expires = row.emailVerifyExpiresAt ? new Date(row.emailVerifyExpiresAt).getTime() : 0;
      if (!expires || expires < Date.now()) {
        return res.status(400).json({ error: "invalid_or_expired_token" });
      }
      db.prepare(`
        UPDATE User SET
          emailVerified = 1,
          emailVerifyTokenHash = NULL,
          emailVerifyExpiresAt = NULL
        WHERE id = ?
      `).run(row.id);
    }

    const issued = issueAuthForUser(row.id);
    if (!issued) return res.status(500).json({ error: "internal_error" });
    return res.json(issued);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/auth/resend-verification
 * { email } — повторная отправка письма (только для неподтверждённых аккаунтов)
 */
router.post("/resend-verification", async (req, res) => {
  try {
    const email = (req.body as { email?: string })?.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email_required" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "invalid_email_format" });

    const userRow = db.prepare(`
      SELECT id, email, emailVerified FROM User WHERE email = ? COLLATE NOCASE
    `).get(email) as { id: number; email: string; emailVerified: number | null } | undefined;

    if (!userRow || userRow.emailVerified === 1) {
      return res.json({ ok: true });
    }

    const last = resendVerificationLastAt.get(email) ?? 0;
    if (Date.now() - last < RESEND_VERIFICATION_COOLDOWN_MS) {
      return res.status(429).json({ error: "rate_limited" });
    }
    resendVerificationLastAt.set(email, Date.now());

    const rawVerify = generateVerificationToken();
    const verifyHash = hashVerificationToken(rawVerify);
    const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();
    const verifySentAt = new Date().toISOString();

    db.prepare(`
      UPDATE User SET emailVerifyTokenHash = ?, emailVerifyExpiresAt = ?, emailVerifySentAt = ?
      WHERE id = ?
    `).run(verifyHash, verifyExpires, verifySentAt, userRow.id);

    try {
      await sendVerificationEmail(userRow.email, buildEmailVerificationUrl(rawVerify));
    } catch (e) {
      console.error("[resend-verification] send failed:", e);
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
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
