"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const router = (0, express_1.Router)();
/**
 * GET /api/user/me
 * Возвращает текущего пользователя с профилем
 */
router.get('/me', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return res.status(401).json({ error: 'unauthorized' });
        const user = db_1.db.prepare(`
      SELECT u.*, p.id as profileId, p.username, p.name, p.bio, p.userId as profileUserId
      FROM User u
      LEFT JOIN Profile p ON u.id = p.userId
      WHERE u.id = ?
    `).get(userId);
        if (!user)
            return res.status(404).json({ error: 'not_found' });
        return res.json({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            profile: user.profileId
                ? {
                    id: user.profileId,
                    username: user.username,
                    name: user.name,
                    bio: user.bio,
                    userId: user.profileUserId,
                }
                : null,
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'internal', message: e === null || e === void 0 ? void 0 : e.message });
    }
});
exports.default = router;
