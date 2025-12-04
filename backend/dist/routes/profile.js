"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// GET /api/profile
router.get("/", async (req, res) => {
    const userId = req.user.id;
    const profile = await prisma_1.prisma.profile.findUnique({ where: { userId } });
    res.json(profile);
});
// PATCH /api/profile
router.patch("/", async (req, res) => {
    const userId = req.user.id;
    const { username, name, bio, avatarUrl } = req.body || {};
    // если меняем username — проверить уникальность
    if (username) {
        const exists = await prisma_1.prisma.profile.findUnique({ where: { username } });
        if (exists && exists.userId !== userId)
            return res.status(400).json({ error: "username_taken" });
    }
    const updated = await prisma_1.prisma.profile.update({
        where: { userId },
        data: { username, name, bio, avatarUrl }
    });
    res.json(updated);
});
exports.default = router;
