import { Router } from "express";
import { db } from "../utils/db";

const router = Router();

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
    let profile = db.prepare(`
      SELECT p.*, u.id as userId
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE LOWER(TRIM(p.username)) = ?
    `).get(username) as any;
    
    // Если не нашли, пробуем без LOWER и TRIM (на случай если username уже в нижнем регистре)
    if (!profile) {
      console.log(`[PUBLIC] Trying exact match for username: "${rawUsername}"`);
      profile = db.prepare(`
        SELECT p.*, u.id as userId
        FROM Profile p
        JOIN User u ON p.userId = u.id
        WHERE p.username = ?
      `).get(rawUsername) as any;
    }
    
    // Если все еще не нашли, пробуем с TRIM но без LOWER
    if (!profile) {
      console.log(`[PUBLIC] Trying TRIM match for username: "${rawUsername}"`);
      profile = db.prepare(`
        SELECT p.*, u.id as userId
        FROM Profile p
        JOIN User u ON p.userId = u.id
        WHERE TRIM(p.username) = ?
      `).get(rawUsername) as any;
    }
    
    // Для отладки: выводим все профили с похожим username
    if (!profile) {
      const allProfiles = db.prepare(`
        SELECT p.id, p.username, LOWER(TRIM(p.username)) as lower_trimmed, p.userId
        FROM Profile p
        LIMIT 20
      `).all() as any[];
      console.log(`[PUBLIC] All profiles in DB (first 20):`, allProfiles);
    }
    
    console.log(`[PUBLIC] Profile found:`, profile ? { id: profile.id, username: profile.username, userId: profile.userId } : 'null');
    
    if (!profile) {
      console.log(`[PUBLIC] Profile not found for username: "${username}" (raw: "${rawUsername}")`);
      return res.status(404).json({ error: "not_found", message: `Profile with username "${username}" not found` });
    }

    const blocks = db.prepare(`
      SELECT * FROM Block 
      WHERE userId = ? 
      ORDER BY sort ASC
    `).all(profile.userId) as any[];

    res.json({
      name: profile.name || profile.username,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      backgroundUrl: profile.backgroundUrl,
      phone: profile.phone,
      email: profile.email,
      telegram: profile.telegram,
      blocks: blocks.map((b) => ({
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
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
