"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../utils/auth");
const usernameGenerator_1 = require("../utils/usernameGenerator");
const constants_1 = require("../constants");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
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
    res.json(parseProfileJsonFields(profile));
});
// PATCH /api/profile
router.patch("/", async (req, res) => {
    const userId = req.user.id;
    const { username, name, bio, avatarUrl, backgroundUrl, phone, email, telegram, layout, blockSizes } = req.body || {};
    // Проверяем, что пользователь существует
    const user = db_1.db.prepare("SELECT id FROM User WHERE id = ?").get(userId);
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
        profileUpdates.push("bio = ?");
        profileValues.push(bio);
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
        // Валидация email
        const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ error: "invalid_email_format" });
        }
        profileUpdates.push("email = ?");
        profileValues.push(email);
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
    // Если email изменился, также обновляем User таблицу для синхронизации
    if (email !== undefined) {
        const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
        if (EMAIL_RE.test(email)) {
            const userUpdate = db_1.db.prepare("UPDATE User SET email = ? WHERE id = ?");
            userUpdate.run(email, userId);
        }
    }
    const updated = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
    res.json(parseProfileJsonFields(updated));
});
exports.default = router;
