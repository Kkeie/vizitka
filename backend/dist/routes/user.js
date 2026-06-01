"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.get("/me", auth_1.requireAuth, async (req, res) => {
    var _a, _b;
    try {
        const user = db_1.db.prepare(`
       SELECT u.*, p.id as profileId, p.username, p.name, p.bio, p.email, p.userId as profileUserId
       FROM User u
       LEFT JOIN Profile p ON u.id = p.userId
       WHERE u.id = ?
     `).get(req.user.id);
        if (!user)
            return res.status(404).json({ error: "not_found" });
        res.json({
            id: user.id,
            email: user.email,
            username: user.username || req.user.username,
            createdAt: user.createdAt,
            emailVerified: user.emailVerified === 1,
            pendingEmail: ((_a = user.pendingEmail) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            emailChangePending: Boolean((_b = user.pendingEmail) === null || _b === void 0 ? void 0 : _b.trim()),
            profile: user.profileId ? {
                id: user.profileId,
                username: user.username,
                name: user.name,
                bio: user.bio,
                email: user.email,
                userId: user.profileUserId,
            } : null,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
