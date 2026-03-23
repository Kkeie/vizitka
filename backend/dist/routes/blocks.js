"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
function parseNoteStyleColumn(raw) {
    if (raw == null || raw === "")
        return null;
    try {
        const o = JSON.parse(raw);
        return typeof o === "object" && o !== null && !Array.isArray(o) ? o : null;
    }
    catch {
        return null;
    }
}
function sanitizeNoteStyleForDb(input) {
    if (input === null || input === undefined)
        return null;
    if (typeof input !== "object" || Array.isArray(input))
        return null;
    const p = input;
    const out = {};
    const align = p.align;
    if (align === "left" || align === "center" || align === "right")
        out.align = align;
    const hexOk = (s) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s.trim());
    if (typeof p.backgroundColor === "string" && hexOk(p.backgroundColor))
        out.backgroundColor = p.backgroundColor.trim();
    if (typeof p.textColor === "string" && hexOk(p.textColor))
        out.textColor = p.textColor.trim();
    const ff = p.fontFamily;
    if (ff === "default" || ff === "serif" || ff === "mono" || ff === "system")
        out.fontFamily = ff;
    if (p.bold === true)
        out.bold = true;
    else if (p.bold === false)
        out.bold = false;
    if (p.italic === true)
        out.italic = true;
    else if (p.italic === false)
        out.italic = false;
    if (Object.keys(out).length === 0)
        return null;
    return JSON.stringify(out);
}
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
        socialType: b.socialType,
        socialUrl: b.socialUrl,
        noteStyle: parseNoteStyleColumn(b.noteStyle),
    };
}
function mapUnifiedToDb(type, patch) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
            if (patch.noteStyle !== undefined) {
                data.noteStyle = patch.noteStyle === null ? null : sanitizeNoteStyleForDb(patch.noteStyle);
            }
            // чистим остальные поля
            data.linkUrl = null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "section":
            if (patch.content !== undefined)
                data.note = (_b = patch.content) !== null && _b !== void 0 ? _b : null;
            if (patch.note !== undefined)
                data.note = (_c = patch.note) !== null && _c !== void 0 ? _c : null;
            data.noteStyle = null;
            data.linkUrl = null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            data.socialType = null;
            data.socialUrl = null;
            break;
        case "link":
            if (patch.url !== undefined)
                data.linkUrl = (_d = patch.url) !== null && _d !== void 0 ? _d : null;
            if (patch.linkUrl !== undefined)
                data.linkUrl = (_e = patch.linkUrl) !== null && _e !== void 0 ? _e : null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "photo":
            if (patch.url !== undefined)
                data.photoUrl = (_f = patch.url) !== null && _f !== void 0 ? _f : null;
            if (patch.photoUrl !== undefined)
                data.photoUrl = (_g = patch.photoUrl) !== null && _g !== void 0 ? _g : null;
            data.linkUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "video":
            if (patch.url !== undefined)
                data.videoUrl = (_h = patch.url) !== null && _h !== void 0 ? _h : null;
            if (patch.videoUrl !== undefined)
                data.videoUrl = (_j = patch.videoUrl) !== null && _j !== void 0 ? _j : null;
            data.linkUrl = null;
            data.photoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            break;
        case "music":
            if (patch.url !== undefined)
                data.musicEmbed = (_k = patch.url) !== null && _k !== void 0 ? _k : null;
            if (patch.musicEmbed !== undefined)
                data.musicEmbed = (_l = patch.musicEmbed) !== null && _l !== void 0 ? _l : null;
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
            data.socialType = null;
            data.socialUrl = null;
            break;
        case "social":
            if (patch.socialType !== undefined)
                data.socialType = (_m = patch.socialType) !== null && _m !== void 0 ? _m : null;
            if (patch.socialUrl !== undefined)
                data.socialUrl = (_o = patch.socialUrl) !== null && _o !== void 0 ? _o : null;
            data.linkUrl = null;
            data.photoUrl = null;
            data.videoUrl = null;
            data.musicEmbed = null;
            data.mapLat = null;
            data.mapLng = null;
            data.note = null;
            break;
    }
    return data;
}
/**
 * GET /api/blocks — список моих блоков (legacy формат, как ожидает фронт)
 */
router.get("/", auth_1.requireAuth, async (req, res) => {
    // noinspection SqlNoDataSourceInspection
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { type } = req.body;
    if (!type)
        return res.status(400).json({ error: "type_required" });
    const userId = req.user.id;
    // Проверяем, что пользователь существует в базе данных
    // noinspection SqlNoDataSourceInspection
    const userExists = db_1.db.prepare("SELECT id FROM User WHERE id = ?").get(userId);
    if (!userExists) {
        console.error(`[BLOCKS] User ${userId} not found in database`);
        return res.status(401).json({ error: "user_not_found", message: "User does not exist in database" });
    }
    const dbData = mapUnifiedToDb(type, req.body);
    // noinspection SqlNoDataSourceInspection
    const insert = db_1.db.prepare(`
    INSERT INTO Block (userId, type, sort, note, linkUrl, photoUrl, videoUrl, musicEmbed, mapLat, mapLng, socialType, socialUrl, noteStyle)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    try {
        const result = insert.run(userId, type, typeof req.body.sort === "number" ? req.body.sort : 0, (_a = dbData.note) !== null && _a !== void 0 ? _a : null, (_b = dbData.linkUrl) !== null && _b !== void 0 ? _b : null, (_c = dbData.photoUrl) !== null && _c !== void 0 ? _c : null, (_d = dbData.videoUrl) !== null && _d !== void 0 ? _d : null, (_e = dbData.musicEmbed) !== null && _e !== void 0 ? _e : null, (_f = dbData.mapLat) !== null && _f !== void 0 ? _f : null, (_g = dbData.mapLng) !== null && _g !== void 0 ? _g : null, (_h = dbData.socialType) !== null && _h !== void 0 ? _h : null, (_j = dbData.socialUrl) !== null && _j !== void 0 ? _j : null, (_k = dbData.noteStyle) !== null && _k !== void 0 ? _k : null);
        // noinspection SqlNoDataSourceInspection
        const created = db_1.db.prepare("SELECT * FROM Block WHERE id = ?").get(result.lastInsertRowid);
        res.json(mapDbToLegacy(created));
    }
    catch (error) {
        console.error(`[BLOCKS] Failed to create block for user ${userId}:`, error);
        if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            return res.status(400).json({
                error: "foreign_key_constraint_failed",
                message: "User does not exist or database constraint violation"
            });
        }
        return res.status(500).json({ error: "create_block_failed", message: error.message });
    }
});
/**
 * PATCH /api/blocks/:id — обновить блок (унифицированный формат)
 */
router.patch("/:id", auth_1.requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    // noinspection SqlNoDataSourceInspection
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
    if (dbData.socialType !== undefined) {
        updates.push("socialType = ?");
        values.push(dbData.socialType);
    }
    if (dbData.socialUrl !== undefined) {
        updates.push("socialUrl = ?");
        values.push(dbData.socialUrl);
    }
    if (dbData.noteStyle !== undefined) {
        updates.push("noteStyle = ?");
        values.push(dbData.noteStyle);
    }
    if (updates.length > 0) {
        values.push(id);
        const update = db_1.db.prepare(`UPDATE Block SET ${updates.join(", ")} WHERE id = ?`);
        update.run(...values);
    }
    // noinspection SqlNoDataSourceInspection
    const updated = db_1.db.prepare("SELECT * FROM Block WHERE id = ?").get(id);
    res.json(mapDbToLegacy(updated));
});
/**
 * POST /api/blocks/reorder — [{ id, sort }]
 */
router.post("/reorder", auth_1.requireAuth, async (req, res) => {
    const payload = req.body || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    // noinspection SqlNoDataSourceInspection
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
    // noinspection SqlNoDataSourceInspection
    db_1.db.prepare("DELETE FROM Block WHERE id = ? AND userId = ?").run(id, req.user.id);
    res.json({ ok: true });
});
exports.default = router;
