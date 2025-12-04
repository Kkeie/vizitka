"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const me = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { profile: true },
        });
        if (!me)
            return res.status(404).json({ error: "not_found" });
        res.json({
            id: me.id,
            username: req.user.username,
            createdAt: me.createdAt,
            profile: me.profile,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
