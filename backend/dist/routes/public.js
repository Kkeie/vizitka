"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../utils/db");
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
const router = (0, express_1.Router)();
/**
 * Публичная страница визитки:
 * GET /api/public/:username
 */
router.get("/:username", async (req, res) => {
    try {
        // Декодируем username из URL (на случай если он был закодирован)
        const decodedUsername = decodeURIComponent(String(req.params.username || ""));
        const rawUsername = decodedUsername.trim();
        const username = rawUsername.toLowerCase();
        console.log(`[PUBLIC] Fetching profile for username: "${username}" (raw: "${rawUsername}", decoded: "${decodedUsername}")`);
        // Системные маршруты, которые не должны обрабатываться как username
        const SYSTEM_ROUTES = ["login", "register", "editor", "u", "api", "index.html", "404.html", "index", "public", "favicon.ico", "robots.txt"];
        if (!username || username === "" || SYSTEM_ROUTES.includes(username)) {
            console.log(`[PUBLIC] Invalid username: "${username}" (system route or empty)`);
            return res.status(404).json({ error: "not_found", message: "Username is required" });
        }
        // Пробуем найти профиль разными способами для совместимости
        let profile = db_1.db.prepare(`
      SELECT p.*, u.id as userId
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE LOWER(TRIM(p.username)) = ?
    `).get(username);
        // Если не нашли, пробуем без LOWER и TRIM (на случай если username уже в нижнем регистре)
        if (!profile) {
            console.log(`[PUBLIC] Trying exact match for username: "${rawUsername}"`);
            profile = db_1.db.prepare(`
        SELECT p.*, u.id as userId
        FROM Profile p
        JOIN User u ON p.userId = u.id
        WHERE p.username = ?
      `).get(rawUsername);
        }
        // Если все еще не нашли, пробуем с TRIM но без LOWER
        if (!profile) {
            console.log(`[PUBLIC] Trying TRIM match for username: "${rawUsername}"`);
            profile = db_1.db.prepare(`
        SELECT p.*, u.id as userId
        FROM Profile p
        JOIN User u ON p.userId = u.id
        WHERE TRIM(p.username) = ?
      `).get(rawUsername);
        }
        console.log(`[PUBLIC] Profile found:`, profile ? { id: profile.id, username: profile.username, userId: profile.userId } : 'null');
        if (!profile) {
            console.log(`[PUBLIC] Profile not found for username: "${username}" (raw: "${rawUsername}")`);
            return res.status(404).json({ error: "not_found", message: `Profile with username "${username}" not found` });
        }
        const blocks = db_1.db.prepare(`
      SELECT * FROM Block 
      WHERE userId = ? 
      ORDER BY sort ASC
    `).all(profile.userId);
        // Парсим layout
        let layout = null;
        if (profile.layout) {
            try {
                layout = JSON.parse(profile.layout);
            }
            catch {
                layout = null;
            }
        }
        let blockSizes = null;
        if (profile.blockSizes) {
            try {
                blockSizes = JSON.parse(profile.blockSizes);
            }
            catch {
                blockSizes = null;
            }
        }
        let blocksForResponse = [];
        if (layout) {
            // Собираем все ID блоков из layout в порядке обхода колонок
            const allIds = [];
            const breakpoints = ['mobile', 'tablet', 'desktop'];
            breakpoints.forEach(bp => {
                if (layout[bp]) {
                    layout[bp].forEach((col) => {
                        col.forEach(id => {
                            if (!allIds.includes(id))
                                allIds.push(id);
                        });
                    });
                }
            });
            const blockMap = new Map(blocks.map((b) => [b.id, b]));
            blocksForResponse = allIds.map(id => blockMap.get(id)).filter(Boolean);
        }
        else {
            blocksForResponse = blocks.sort((a, b) => a.sort - b.sort);
        }
        res.json({
            name: profile.name || profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            backgroundUrl: profile.backgroundUrl,
            phone: profile.phone,
            email: profile.email,
            telegram: profile.telegram,
            blocks: blocksForResponse.map(mapDbToLegacy),
            layout,
            blockSizes,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
    }
});
exports.default = router;
