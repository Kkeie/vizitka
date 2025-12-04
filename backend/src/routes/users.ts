import { Router } from 'express';
import { db } from '../utils/db';

const router = Router();

/**
 * GET /api/user/me
 * Возвращает текущего пользователя с профилем
 */
router.get('/me', async (req, res) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const user = db.prepare(`
      SELECT u.*, p.id as profileId, p.username, p.name, p.bio, p.userId as profileUserId
      FROM User u
      LEFT JOIN Profile p ON u.id = p.userId
      WHERE u.id = ?
    `).get(userId) as any;

    if (!user) return res.status(404).json({ error: 'not_found' });

    return res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      profile: user.profileId
        ? {
          id: user.profileId,
          username: user.username,
          name: user.name,
          bio: user.bio,
          userId: user.profileUserId,
        }
        : null,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'internal', message: e?.message });
  }
});

export default router;
