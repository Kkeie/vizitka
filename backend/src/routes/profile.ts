import { Router } from "express";
import { db } from "../utils/db";
import { requireAuth, type AuthedRequest } from "../utils/auth";

const router = Router();
router.use(requireAuth);

// GET /api/profile
router.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const profile = db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId) as any;
  res.json(profile);
});

// PATCH /api/profile
router.patch("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const { username, name, bio, avatarUrl, backgroundUrl } = req.body || {};
  
  // если меняем username — проверить уникальность
  if (username !== undefined) {
    const exists = db.prepare("SELECT id, userId FROM Profile WHERE username = ?").get(username) as any;
    if (exists && exists.userId !== userId) return res.status(400).json({ error: "username_taken" });
  }
  
  // Строим UPDATE запрос динамически
  const updates: string[] = [];
  const values: any[] = [];
  
  if (username !== undefined) {
    updates.push("username = ?");
    values.push(username);
  }
  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }
  if (bio !== undefined) {
    updates.push("bio = ?");
    values.push(bio);
  }
  if (avatarUrl !== undefined) {
    updates.push("avatarUrl = ?");
    values.push(avatarUrl);
  }
  if (backgroundUrl !== undefined) {
    updates.push("backgroundUrl = ?");
    values.push(backgroundUrl);
  }
  
  if (updates.length > 0) {
    values.push(userId);
    const update = db.prepare(`UPDATE Profile SET ${updates.join(", ")} WHERE userId = ?`);
    update.run(...values);
  }
  
  const updated = db.prepare("SELECT * FROM Profile WHERE userId = ?").get(userId) as any;
  res.json(updated);
});

export default router;
