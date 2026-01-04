"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// GET /api/profile
router.get("/", async (req, res) => {
    const userId = req.user.id;
    const profile = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
    res.json(profile);
});
// PATCH /api/profile
router.patch("/", async (req, res) => {
    const userId = req.user.id;
    const { username, name, bio, avatarUrl } = req.body || {};
    // если меняем username — проверить уникальность
    if (username !== undefined) {
        const exists = db_1.db.prepare("SELECT id, userId FROM Profile WHERE username = ?").get(username);
        if (exists && exists.userId !== userId)
            return res.status(400).json({ error: "username_taken" });
    }
    // Строим UPDATE запрос динамически
    const updates = [];
    const values = [];
    if (username !== undefined) {
        updates.push("username = ?");
        values.push(username);
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
    if (updates.length > 0) {
        values.push(userId);
        const update = db_1.db.prepare(`UPDATE Profile SET ${updates.join(", ")} WHERE userId = ?`);
        update.run(...values);
    }
    const updated = db_1.db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId);
    res.json(updated);
});
exports.default = router;
