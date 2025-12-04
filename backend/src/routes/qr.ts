import { Router } from "express";
import QRCode from "qrcode";

const router = Router();

// GET /api/qr?url=...
router.get("/", async (req, res) => {
  const url = String(req.query.url || "");
  if (!url) return res.status(400).json({ error: "missing_url" });

  try {
    const png = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 256 });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "qr_error" });
  }
});

export default router;
