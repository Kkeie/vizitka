"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qrcode_1 = __importDefault(require("qrcode"));
const router = (0, express_1.Router)();
// GET /api/qr?url=...
router.get("/", async (req, res) => {
    const url = String(req.query.url || "");
    if (!url)
        return res.status(400).json({ error: "missing_url" });
    try {
        const png = await qrcode_1.default.toBuffer(url, { type: "png", margin: 1, width: 256 });
        res.setHeader("Content-Type", "image/png");
        res.send(png);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "qr_error" });
    }
});
exports.default = router;
