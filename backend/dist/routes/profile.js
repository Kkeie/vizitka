"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../utils/auth");
const usernameGenerator_1 = require("../utils/usernameGenerator");
const constants_1 = require("../constants");
const emailVerification_1 = require("../utils/emailVerification");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseProfileJsonFields(profile) {
    if (!profile)
        return profile;
    const normalized = { ...profile };
    if (normalized.layout) {
        try {
            normalized.layout = JSON.parse(normalized.layout);
        }
        catch {
            normalized.layout = null;
        }
    }
    else {
        normalized.layout = null;
    }
    if (normalized.blockSizes) {
        try {
            normalized.blockSizes = JSON.parse(normalized.blockSizes);
        }
        catch {
            normalized.blockSizes = null;
        }
    }
    else {
        normalized.blockSizes = null;
    }
    return normalized;
}
function enrichProfileResponse(profile, userId) {
    var _a;
    const userRow = db_1.db
        .prepare("SELECT pendingEmail FROM User WHERE id = ?")
        .get(userId);
    const pendingEmail = ((_a = userRow === null || userRow === void 0 ? void 0 : userRow.pendingEmail) === null || _a === void 0 ? void 0 : _a.trim()) || null;
    return {
        ...parseProfileJsonFields(profile),
        pendingEmail,
        emailChangePending: Boolean(pendingEmail),
    };
}
// GET /api/profile
router.get("/", async (req, res) => {
    const userId = req.user.id;
    const username = req.user.username;
    // Проверяем, что пользователь существует
    const user = db_1.db.prepare("SELECT id FROM User WHERE id = ?").get(userId);
    if (!user) {
        console.error(`[PROFILE] User ${userId} not found in database`);
        return res.status(401).json({ error: "user_not_found", message: "User does not exist in database" });
    }
    let profile = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
    // Если профиль не существует, создаем его автоматически
    if (!profile) {
        console.log(`[PROFILE] Profile not found for user ${userId}, creating new profile with username: ${username}`);
        try {
            const insert = db_1.db.prepare("INSERT INTO Profile (userId, username, name) VALUES (?, ?, ?)");
            insert.run(userId, username, username);
            profile = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
            console.log(`[PROFILE] Profile created successfully:`, profile);
        }
        catch (e) {
            console.error(`[PROFILE] Failed to create profile:`, e);
            // Если username уже занят, используем userId как username
            const fallbackUsername = `user${userId}`;
            const insert = db_1.db.prepare("INSERT INTO Profile (userId, username, name) VALUES (?, ?, ?)");
            insert.run(userId, fallbackUsername, fallbackUsername);
            profile = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
        }
    }
    if (!profile) {
        console.error(`[PROFILE] Failed to get or create profile for user ${userId}`);
        return res.status(500).json({ error: "profile_creation_failed", message: "Failed to create profile" });
    }
    res.json(enrichProfileResponse(profile, userId));
});
// PATCH /api/profile
router.patch("/", async (req, res) => {
    const userId = req.user.id;
    const { username, name, bio, avatarUrl, backgroundUrl, phone, email, telegram, layout, blockSizes } = req.body || {};
    // Проверяем, что пользователь существует
    const user = db_1.db.prepare("SELECT id, email FROM User WHERE id = ?").get(userId);
    if (!user) {
        console.error(`[PROFILE] User ${userId} not found in database`);
        return res.status(401).json({ error: "user_not_found", message: "User does not exist in database" });
    }
    // Строим UPDATE запрос динамически для Profile таблицы
    const profileUpdates = [];
    const profileValues = [];
    // Обработка username с нормализацией
    if (username !== undefined) {
        const normalized = username.trim().toLowerCase();
        if (normalized.length < 3) {
            return res.status(400).json({ error: "username_too_short", message: "Username must be at least 3 characters" });
        }
        if (normalized.length > constants_1.USERNAME_MAX_LENGTH) {
            return res.status(400).json({ error: "username_too_long", message: "Username is too long" });
        }
        if (!(0, usernameGenerator_1.isValidUsernameFormat)(normalized)) {
            return res.status(400).json({ error: "invalid_username_format", message: "Only latin letters, numbers and underscore are allowed" });
        }
        if (constants_1.RESERVED_USERNAMES.includes(normalized)) {
            const suggestions = await (0, usernameGenerator_1.findAvailableUsernames)(db_1.db, normalized, 42);
            return res.status(400).json({ error: "username_taken", suggestions });
        }
        // Проверка уникальности
        const exists = db_1.db.prepare("SELECT id, userId FROM Profile WHERE username = ?").get(normalized);
        if (exists && exists.userId !== userId) {
            return res.status(400).json({ error: "username_taken", message: "Username already taken" });
        }
        profileUpdates.push("username = ?");
        profileValues.push(normalized);
    }
    if (name !== undefined) {
        profileUpdates.push("name = ?");
        profileValues.push(name);
    }
    if (bio !== undefined) {
        const bioStr = bio === null ? null : String(bio).trim() || null;
        if (bioStr !== null && bioStr.length > constants_1.BIO_MAX_LENGTH) {
            return res.status(400).json({ error: "bio_too_long", message: `Bio must be at most ${constants_1.BIO_MAX_LENGTH} characters` });
        }
        profileUpdates.push("bio = ?");
        profileValues.push(bioStr);
    }
    if (avatarUrl !== undefined) {
        profileUpdates.push("avatarUrl = ?");
        profileValues.push(avatarUrl);
    }
    if (backgroundUrl !== undefined) {
        profileUpdates.push("backgroundUrl = ?");
        profileValues.push(backgroundUrl);
    }
    if (phone !== undefined) {
        profileUpdates.push("phone = ?");
        profileValues.push(phone);
    }
    if (email !== undefined) {
        const emailStr = String(email).trim().toLowerCase();
        if (emailStr.length > constants_1.EMAIL_MAX_LENGTH) {
            return res.status(400).json({ error: "email_too_long" });
        }
        if (!EMAIL_RE.test(emailStr)) {
            return res.status(400).json({ error: "invalid_email_format" });
        }
        const currentAuthEmail = user.email.trim().toLowerCase();
        if (emailStr === currentAuthEmail) {
            profileUpdates.push("email = ?");
            profileValues.push(emailStr);
        }
        else {
            if ((0, emailVerification_1.isEmailTakenByAnotherUser)(emailStr, userId)) {
                return res.status(409).json({ error: "email_taken" });
            }
            const { rawToken, targetEmail } = (0, emailVerification_1.queueEmailVerification)(userId, emailStr, true);
            (0, emailVerification_1.sendQueuedVerificationEmail)(rawToken, targetEmail);
        }
    }
    if (telegram !== undefined) {
        profileUpdates.push("telegram = ?");
        profileValues.push(telegram);
    }
    if (layout !== undefined) {
        profileUpdates.push("layout = ?");
        profileValues.push(JSON.stringify(layout));
    }
    if (blockSizes !== undefined) {
        profileUpdates.push("blockSizes = ?");
        profileValues.push(JSON.stringify(blockSizes));
    }
    // Обновляем Profile таблицу
    if (profileUpdates.length > 0) {
        profileValues.push(userId);
        const profileUpdate = db_1.db.prepare(`UPDATE Profile SET ${profileUpdates.join(", ")} WHERE userId = ?`);
        profileUpdate.run(...profileValues);
    }
    const updated = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
    res.json(enrichProfileResponse(updated, userId));
});
exports.default = router;
