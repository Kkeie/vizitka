"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * { username, password }
 */
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("[REGISTER] Attempt:", { username: (username === null || username === void 0 ? void 0 : username.substring(0, 3)) + "***" });
        if (!username || !password)
            return res.status(400).json({ error: "username_and_password_required" });
        const uname = username.trim().toLowerCase();
        if (uname.length < 3)
            return res.status(400).json({ error: "username_too_short" });
        if (password.length < 4)
            return res.status(400).json({ error: "password_too_short" });
        // Проверяем существование username
        console.log("[REGISTER] Checking existing username:", uname);
        const existingProfile = db_1.db.prepare("SELECT id FROM Profile WHERE username = ?").get(uname);
        if (existingProfile) {
            console.log("[REGISTER] Username already taken:", uname);
            return res.status(409).json({ error: "username_taken" });
        }
        const passwordHash = await (0, auth_1.hashPassword)(password);
        // Создаем пользователя и профиль в транзакции
        const insertUser = db_1.db.prepare("INSERT INTO User (email, passwordHash) VALUES (?, ?)");
        const insertProfile = db_1.db.prepare("INSERT INTO Profile (username, name, userId) VALUES (?, ?, ?)");
        const transaction = db_1.db.transaction(() => {
            const userResult = insertUser.run(`${uname}@local`, passwordHash);
            const userId = userResult.lastInsertRowid;
            const profileResult = insertProfile.run(uname, uname, userId);
            const profileId = profileResult.lastInsertRowid;
            return {
                userId,
                profileId,
                username: uname,
                createdAt: new Date().toISOString(),
            };
        });
        const result = transaction();
        console.log("[REGISTER] Success:", { userId: result.userId, username: uname });
        const token = (0, auth_1.signToken)({ id: result.userId, username: uname });
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
    }
    catch (e) {
        console.error("[REGISTER] Error:", e);
        console.error("[REGISTER] Error stack:", e instanceof Error ? e.stack : "No stack");
        res.status(500).json({ error: "internal_error", message: e instanceof Error ? e.message : String(e) });
    }
});
/**
 * POST /api/auth/login
 * { username, password }
 */
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "username_and_password_required" });
        const uname = username.trim().toLowerCase();
        // Получаем профиль с пользователем
        const profile = db_1.db.prepare(`
      SELECT p.*, u.id as userId, u.passwordHash, u.createdAt as userCreatedAt
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE p.username = ?
    `).get(uname);
        if (!profile || !profile.passwordHash)
            return res.status(401).json({ error: "invalid_credentials" });
        const ok = await (0, auth_1.verifyPassword)(password, profile.passwordHash);
        if (!ok)
            return res.status(401).json({ error: "invalid_credentials" });
        const token = (0, auth_1.signToken)({ id: profile.userId, username: uname });
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
