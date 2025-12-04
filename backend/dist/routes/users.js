"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
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
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!user)
            return res.status(404).json({ error: 'not_found' });
        return res.json({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            profile: user.profile
                ? {
                    id: user.profile.id,
                    username: user.profile.username,
                    name: user.profile.name,
                    bio: user.profile.bio,
                    userId: user.profile.userId,
                }
                : null,
        });
    }
    catch (e) {
        return res.status(500).json({ error: 'internal', message: e === null || e === void 0 ? void 0 : e.message });
    }
});
exports.default = router;
