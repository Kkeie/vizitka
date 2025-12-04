"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const router = (0, express_1.Router)();
/**
 * Публичная страница визитки:
 * GET /api/public/:username
 */
router.get("/:username", async (req, res) => {
    try {
        const username = String(req.params.username || "").toLowerCase();
        const profile = await prisma_1.prisma.profile.findUnique({
            where: { username },
            include: { user: true },
        });
        if (!profile)
            return res.status(404).json({ error: "not_found" });
        const blocks = await prisma_1.prisma.block.findMany({
            where: { userId: profile.userId },
            orderBy: { sort: "asc" },
        });
        res.json({
            name: profile.name || profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            blocks: blocks.map((b) => ({
                id: b.id,
                type: b.type,
                sort: b.sort,
                note: b.note,
                linkUrl: b.linkUrl,
                photoUrl: b.photoUrl,
                videoUrl: b.videoUrl, // ожидается youtube embeddable url в редакторе
                musicEmbed: b.musicEmbed,
                mapLat: b.mapLat,
                mapLng: b.mapLng,
            })),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
