import { Router } from "express";
import { db } from "../utils/db";

const router = Router();

/**
 * Публичная страница визитки:
 * GET /api/public/:username
 */
router.get("/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").toLowerCase().trim();
    console.log(`[PUBLIC] Fetching profile for username: "${username}"`);
    
    if (!username || username === "") {
      console.log(`[PUBLIC] Empty username`);
      return res.status(404).json({ error: "not_found", message: "Username is required" });
    }
    
    const profile = db.prepare(`
      SELECT p.*, u.id as userId
      FROM Profile p
      JOIN User u ON p.userId = u.id
      WHERE LOWER(TRIM(p.username)) = ?
    `).get(username) as any;
    
    console.log(`[PUBLIC] Profile found:`, profile ? { id: profile.id, username: profile.username, userId: profile.userId } : 'null');
    
    if (!profile) {
      console.log(`[PUBLIC] Profile not found for username: "${username}"`);
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
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
