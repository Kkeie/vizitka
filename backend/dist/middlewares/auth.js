"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
let cachedJwtSecret = null;
function getJwtSecret() {
    var _a;
    if (cachedJwtSecret)
        return cachedJwtSecret;
    const envSecret = (_a = process.env.JWT_SECRET) === null || _a === void 0 ? void 0 : _a.trim();
    if (envSecret && envSecret.length >= 32) {
        cachedJwtSecret = envSecret;
        return cachedJwtSecret;
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set and contain at least 32 characters in production");
    }
    cachedJwtSecret = crypto_1.default.randomBytes(48).toString("hex");
    return cachedJwtSecret;
}
function requireAuth(req, res, next) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token)
        return res.status(401).json({ error: "unauthorized" });
    try {
        const payload = jsonwebtoken_1.default.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
        if (typeof payload !== "object" || payload == null) {
            return res.status(401).json({ error: "unauthorized" });
        }
        const id = Number(payload.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(401).json({ error: "unauthorized" });
        }
        req.userId = id;
        next();
    }
    catch {
        res.status(401).json({ error: "unauthorized" });
    }
}
