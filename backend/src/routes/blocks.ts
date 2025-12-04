import { Router } from "express";
import { db } from "../utils/db";
import { requireAuth, AuthedRequest } from "../utils/auth";

const router = Router();

// Возвращаем legacy-формат блоков, как в публичном API и как ожидает фронт
function mapDbToLegacy(b: any) {
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

function mapUnifiedToDb(type: string, patch: { url?: string | null; content?: string | null; sort?: number | null } & any) {
  const data: any = {};

  if (typeof patch.sort === "number") data.sort = patch.sort;

  // общий контент (а также совместимость со старым полем note)
  if (patch.content !== undefined) data.note = patch.content;
  if (patch.note !== undefined) data.note = patch.note;

  // типоспецифичные поля
  switch (type) {
    case "note":
      if (patch.content !== undefined) data.note = patch.content ?? null;
      // чистим остальные поля
      data.linkUrl = null; data.photoUrl = null; data.videoUrl = null; data.musicEmbed = null; data.mapLat = null; data.mapLng = null;
      break;

    case "link":
      if (patch.url !== undefined) data.linkUrl = patch.url ?? null;
      if (patch.linkUrl !== undefined) data.linkUrl = patch.linkUrl ?? null;
      data.photoUrl = null; data.videoUrl = null; data.musicEmbed = null; data.mapLat = null; data.mapLng = null;
      break;

    case "photo":
      if (patch.url !== undefined) data.photoUrl = patch.url ?? null;
      if (patch.photoUrl !== undefined) data.photoUrl = patch.photoUrl ?? null;
      data.linkUrl = null; data.videoUrl = null; data.musicEmbed = null; data.mapLat = null; data.mapLng = null;
      break;

    case "video":
      if (patch.url !== undefined) data.videoUrl = patch.url ?? null;
      if (patch.videoUrl !== undefined) data.videoUrl = patch.videoUrl ?? null;
      data.linkUrl = null; data.photoUrl = null; data.musicEmbed = null; data.mapLat = null; data.mapLng = null;
      break;

    case "music":
      if (patch.url !== undefined) data.musicEmbed = patch.url ?? null;
      if (patch.musicEmbed !== undefined) data.musicEmbed = patch.musicEmbed ?? null;
      data.linkUrl = null; data.photoUrl = null; data.videoUrl = null; data.mapLat = null; data.mapLng = null;
      break;

    case "map":
      if (patch.url !== undefined) {
        if (patch.url && patch.url.includes(",")) {
          const [latRaw, lngRaw] = patch.url.split(",").map((s: string) => s.trim());
          const lat = Number(latRaw);
          const lng = Number(lngRaw);
          if (!isNaN(lat) && !isNaN(lng)) {
            data.mapLat = lat;
            data.mapLng = lng;
          } else {
            data.mapLat = null;
            data.mapLng = null;
          }
        } else {
          data.mapLat = null;
          data.mapLng = null;
        }
      }
      if (patch.mapLat !== undefined) data.mapLat = patch.mapLat == null ? null : Number(patch.mapLat);
      if (patch.mapLng !== undefined) data.mapLng = patch.mapLng == null ? null : Number(patch.mapLng);
      data.linkUrl = null; data.photoUrl = null; data.videoUrl = null; data.musicEmbed = null;
      break;
  }

  return data;
}

/**
 * GET /api/blocks — список моих блоков (legacy формат, как ожидает фронт)
 */
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const blocks = db.prepare(`
    SELECT * FROM Block 
    WHERE userId = ? 
    ORDER BY sort ASC, id ASC
  `).all(req.user!.id) as any[];

  res.json(blocks.map(mapDbToLegacy));
});

/**
 * POST /api/blocks — создать блок
 * body: { type: "note"|"link"|..., url?: string|null, content?: string|null, sort?: number }
 */
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { type } = req.body as { type: string };
  if (!type) return res.status(400).json({ error: "type_required" });

  const dbData = mapUnifiedToDb(type, req.body);
  
  const insert = db.prepare(`
    INSERT INTO Block (userId, type, sort, note, linkUrl, photoUrl, videoUrl, musicEmbed, mapLat, mapLng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = insert.run(
    req.user!.id,
    type,
    typeof req.body.sort === "number" ? req.body.sort : 0,
    dbData.note ?? null,
    dbData.linkUrl ?? null,
    dbData.photoUrl ?? null,
    dbData.videoUrl ?? null,
    dbData.musicEmbed ?? null,
    dbData.mapLat ?? null,
    dbData.mapLng ?? null
  );

  const created = db.prepare("SELECT * FROM Block WHERE id = ?").get(result.lastInsertRowid) as any;
  res.json(mapDbToLegacy(created));
});

/**
 * PATCH /api/blocks/:id — обновить блок (унифицированный формат)
 */
router.patch("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM Block WHERE id = ? AND userId = ?").get(id, req.user!.id) as any;
  if (!existing) return res.status(404).json({ error: "not_found" });

  const dbData = mapUnifiedToDb(existing.type, req.body);
  
  // Строим UPDATE запрос динамически, обновляя только переданные поля
  const updates: string[] = [];
  const values: any[] = [];
  
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
    const update = db.prepare(`UPDATE Block SET ${updates.join(", ")} WHERE id = ?`);
    update.run(...values);
  }

  const updated = db.prepare("SELECT * FROM Block WHERE id = ?").get(id) as any;
  res.json(mapDbToLegacy(updated));
});

/**
 * POST /api/blocks/reorder — [{ id, sort }]
 */
router.post("/reorder", requireAuth, async (req: AuthedRequest, res) => {
  const payload = (req.body as { items?: { id: number | string; sort: number | string }[] }) || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  
  const update = db.prepare("UPDATE Block SET sort = ? WHERE id = ? AND userId = ?");
  const transaction = db.transaction(() => {
    for (const it of items) {
      update.run(Number(it.sort), Number(it.id), req.user!.id);
    }
  });
  
  transaction();
  res.json({ ok: true });
});

/**
 * DELETE /api/blocks/:id
 */
router.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM Block WHERE id = ? AND userId = ?").run(id, req.user!.id);
  res.json({ ok: true });
});

export default router;
