"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
// Возвращаем legacy-формат блоков, как в публичном API и как ожидает фронт
function mapDbToLegacy(b) {
    return {
        id: b.id,
        type: b.type,
        sort: b.sort,
        note: b.note,
        linkUrl: b.linkUrl,
        photoUrl: b.photoUrl,
        videoUrl: b.videoUrl,
        musicEmbed: b.musicEmbed,
        mapLat: b.mapLat,
        mapLng: b.mapLng,
    };
}
function mapUnifiedToPrisma(type, patch) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const data = {};
    if (typeof patch.sort === "number")
        data.sort = patch.sort;
    // общий контент (а также совместимость со старым полем note)
    if (patch.content !== undefined)
        data.note = patch.content;
    if (patch.note !== undefined)
        data.note = patch.note;
    // типоспецифичные поля
    switch (type) {
        case "note":
            if (patch.content !== undefined)
                data.note = (_a = patch.content) !== null && _a !== void 0 ? _a : null;
            // чистим остальные поля
            data.linkUrl = null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "link":
            if (patch.url !== undefined)
                data.linkUrl = (_b = patch.url) !== null && _b !== void 0 ? _b : null;
            if (patch.linkUrl !== undefined)
                data.linkUrl = (_c = patch.linkUrl) !== null && _c !== void 0 ? _c : null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "photo":
            if (patch.url !== undefined)
                data.photoUrl = (_d = patch.url) !== null && _d !== void 0 ? _d : null;
            if (patch.photoUrl !== undefined)
                data.photoUrl = (_e = patch.photoUrl) !== null && _e !== void 0 ? _e : null;
            data.linkUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "video":
            if (patch.url !== undefined)
                data.videoUrl = (_f = patch.url) !== null && _f !== void 0 ? _f : null;
            if (patch.videoUrl !== undefined)
                data.videoUrl = (_g = patch.videoUrl) !== null && _g !== void 0 ? _g : null;
            data.linkUrl = null;
            data.photoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "music":
            if (patch.url !== undefined)
                data.musicEmbed = (_h = patch.url) !== null && _h !== void 0 ? _h : null;
            if (patch.musicEmbed !== undefined)
                data.musicEmbed = (_j = patch.musicEmbed) !== null && _j !== void 0 ? _j : null;
            data.linkUrl = null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "map":
            if (patch.url !== undefined) {
                if (patch.url && patch.url.includes(",")) {
                    const [latRaw, lngRaw] = patch.url.split(",").map((s) => s.trim());
                    const lat = Number(latRaw);
                    const lng = Number(lngRaw);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        data.mapLat = lat;
                        data.mapLng = lng;
                    }
                    else {
                        data.mapLat = null;
                        data.mapLng = null;
                    }
                }
                else {
                    data.mapLat = null;
                    data.mapLng = null;
                }
            }
            if (patch.mapLat !== undefined)
                data.mapLat = patch.mapLat == null ? null : Number(patch.mapLat);
            if (patch.mapLng !== undefined)
                data.mapLng = patch.mapLng == null ? null : Number(patch.mapLng);
            data.linkUrl = null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            break;
    }
    return data;
}
/**
 * GET /api/blocks — список моих блоков (legacy формат, как ожидает фронт)
 */
router.get("/", auth_1.requireAuth, async (req, res) => {
    const blocks = await prisma_1.prisma.block.findMany({
        where: { userId: req.user.id },
        orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    res.json(blocks.map(mapDbToLegacy));
});
/**
 * POST /api/blocks — создать блок
 * body: { type: "note"|"link"|..., url?: string|null, content?: string|null, sort?: number }
 */
router.post("/", auth_1.requireAuth, async (req, res) => {
    const { type } = req.body;
    if (!type)
        return res.status(400).json({ error: "type_required" });
    const prismaData = mapUnifiedToPrisma(type, req.body);
    const created = await prisma_1.prisma.block.create({
        data: {
            userId: req.user.id,
            type,
            sort: typeof req.body.sort === "number" ? req.body.sort : 0,
            // типоспецифичные поля
            ...prismaData
        }
    });
    res.json(mapDbToLegacy(created));
});
/**
 * PATCH /api/blocks/:id — обновить блок (унифицированный формат)
 */
router.patch("/:id", auth_1.requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma_1.prisma.block.findFirst({ where: { id, userId: req.user.id } });
    if (!existing)
        return res.status(404).json({ error: "not_found" });
    const prismaData = mapUnifiedToPrisma(existing.type, req.body);
    const updated = await prisma_1.prisma.block.update({
        where: { id },
        data: prismaData
    });
    res.json(mapDbToLegacy(updated));
});
/**
 * POST /api/blocks/reorder — [{ id, sort }]
 */
router.post("/reorder", auth_1.requireAuth, async (req, res) => {
    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    await prisma_1.prisma.$transaction(items.map((it) => prisma_1.prisma.block.update({
        where: { id: Number(it.id) },
        data: { sort: Number(it.sort) },
    })));
    res.json({ ok: true });
});
/**
 * DELETE /api/blocks/:id
 */
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    await prisma_1.prisma.block.delete({ where: { id } });
    res.json({ ok: true });
});
exports.default = router;
