"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
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
function mapUnifiedToDb(type, patch) {
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
    const blocks = db_1.db.prepare(`
    SELECT * FROM Block 
    WHERE userId = ? 
    ORDER BY sort ASC, id ASC
  `).all(req.user.id);
    res.json(blocks.map(mapDbToLegacy));
});
/**
 * POST /api/blocks — создать блок
 * body: { type: "note"|"link"|..., url?: string|null, content?: string|null, sort?: number }
 */
router.post("/", auth_1.requireAuth, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { type } = req.body;
    if (!type)
        return res.status(400).json({ error: "type_required" });
    const dbData = mapUnifiedToDb(type, req.body);
    const insert = db_1.db.prepare(`
    INSERT INTO Block (userId, type, sort, note, linkUrl, photoUrl, videoUrl, musicEmbed, mapLat, mapLng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = insert.run(req.user.id, type, typeof req.body.sort === "number" ? req.body.sort : 0, (_a = dbData.note) !== null && _a !== void 0 ? _a : null, (_b = dbData.linkUrl) !== null && _b !== void 0 ? _b : null, (_c = dbData.photoUrl) !== null && _c !== void 0 ? _c : null, (_d = dbData.videoUrl) !== null && _d !== void 0 ? _d : null, (_e = dbData.musicEmbed) !== null && _e !== void 0 ? _e : null, (_f = dbData.mapLat) !== null && _f !== void 0 ? _f : null, (_g = dbData.mapLng) !== null && _g !== void 0 ? _g : null);
    const created = db_1.db.prepare("SELECT * FROM Block WHERE id = ?").get(result.lastInsertRowid);
    res.json(mapDbToLegacy(created));
});
/**
 * PATCH /api/blocks/:id — обновить блок (унифицированный формат)
 */
router.patch("/:id", auth_1.requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = db_1.db.prepare("SELECT * FROM Block WHERE id = ? AND userId = ?").get(id, req.user.id);
    if (!existing)
        return res.status(404).json({ error: "not_found" });
    const dbData = mapUnifiedToDb(existing.type, req.body);
    // Строим UPDATE запрос динамически, обновляя только переданные поля
    const updates = [];
    const values = [];
    if (dbData.sort !== undefined) {
        updates.push("sort = ?");
        values.push(dbData.sort);
    }
    if (dbData.note !== undefined) {
        updates.push("note = ?");
        values.push(dbData.note);
    }
    if (dbData.linkUrl !== undefined) {
        updates.push("linkUrl = ?");
        values.push(dbData.linkUrl);
    }
    if (dbData.photoUrl !== undefined) {
        updates.push("photoUrl = ?");
        values.push(dbData.photoUrl);
    }
    if (dbData.videoUrl !== undefined) {
        updates.push("videoUrl = ?");
        values.push(dbData.videoUrl);
    }
    if (dbData.musicEmbed !== undefined) {
        updates.push("musicEmbed = ?");
        values.push(dbData.musicEmbed);
    }
    if (dbData.mapLat !== undefined) {
        updates.push("mapLat = ?");
        values.push(dbData.mapLat);
    }
    if (dbData.mapLng !== undefined) {
        updates.push("mapLng = ?");
        values.push(dbData.mapLng);
    }
    if (updates.length > 0) {
        values.push(id);
        const update = db_1.db.prepare(`UPDATE Block SET ${updates.join(", ")} WHERE id = ?`);
        update.run(...values);
    }
    const updated = db_1.db.prepare("SELECT * FROM Block WHERE id = ?").get(id);
    res.json(mapDbToLegacy(updated));
});
/**
 * POST /api/blocks/reorder — [{ id, sort }]
 */
router.post("/reorder", auth_1.requireAuth, async (req, res) => {
    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const update = db_1.db.prepare("UPDATE Block SET sort = ? WHERE id = ? AND userId = ?");
    const transaction = db_1.db.transaction(() => {
        for (const it of items) {
            update.run(Number(it.sort), Number(it.id), req.user.id);
        }
    });
    transaction();
    res.json({ ok: true });
});
/**
 * DELETE /api/blocks/:id
 */
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    db_1.db.prepare("DELETE FROM Block WHERE id = ? AND userId = ?").run(id, req.user.id);
    res.json({ ok: true });
});
exports.default = router;
