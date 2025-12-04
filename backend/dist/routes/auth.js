"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * { username, password }
 */
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "username_and_password_required" });
        const uname = username.trim().toLowerCase();
        if (uname.length < 3)
            return res.status(400).json({ error: "username_too_short" });
        if (password.length < 4)
            return res.status(400).json({ error: "password_too_short" });
        const exists = await prisma_1.prisma.profile.findUnique({ where: { username: uname } });
        if (exists)
            return res.status(409).json({ error: "username_taken" });
        const passwordHash = await (0, auth_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                // email не используем — кладем формальный
                email: `${uname}@local`,
                passwordHash,
                profile: { create: { username: uname, name: uname, bio: null } },
            },
            include: { profile: true },
        });
        const token = (0, auth_1.signToken)({ id: user.id, username: uname });
        res.json({
            token,
            user: {
                id: user.id,
                username: uname,
                createdAt: user.createdAt,
                profile: user.profile,
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
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
        const profile = await prisma_1.prisma.profile.findUnique({ where: { username: uname }, include: { user: true } });
        if (!profile || !profile.user)
            return res.status(401).json({ error: "invalid_credentials" });
        const ok = await (0, auth_1.verifyPassword)(password, profile.user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: "invalid_credentials" });
        const token = (0, auth_1.signToken)({ id: profile.user.id, username: uname });
        res.json({
            token,
            user: {
                id: profile.user.id,
                username: uname,
                createdAt: profile.user.createdAt,
                profile: { id: profile.id, username: profile.username, name: profile.name, bio: profile.bio, userId: profile.userId },
            },
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
