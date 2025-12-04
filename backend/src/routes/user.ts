import { Router } from "express";
import { db } from "../utils/db";
import { AuthedRequest, requireAuth } from "../utils/auth";

const router = Router();

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, p.id as profileId, p.username, p.name, p.bio, p.userId as profileUserId
      FROM User u
      LEFT JOIN Profile p ON u.id = p.userId
      WHERE u.id = ?
    `).get(req.user!.id) as any;
    
    if (!user) return res.status(404).json({ error: "not_found" });
    
    res.json({
      id: user.id,
      username: req.user!.username,
      createdAt: user.createdAt,
      profile: user.profileId ? {
        id: user.profileId,
        username: user.username,
        name: user.name,
        bio: user.bio,
        userId: user.profileUserId,
      } : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
