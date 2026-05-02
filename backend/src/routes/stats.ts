import { Router } from "express";
import { requireAuth, AuthedRequest } from "../utils/auth";
import { db } from "../utils/db";
import { getEkaterinburgViewDate } from "../utils/date";

const router = Router();

// GET /api/stats/today
router.get("/today", requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const today = getEkaterinburgViewDate();
  const row = db.prepare(
    "SELECT count FROM daily_views WHERE user_id = ? AND view_date = ?"
  ).get(userId, today) as { count: number } | undefined;
  res.json({ today: row?.count ?? 0 });
});

export default router;