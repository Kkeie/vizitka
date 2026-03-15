"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.signToken = exports.verifyPassword = exports.hashPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const JWT_ISSUER = "vizitka-backend";
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
    console.warn("[AUTH] JWT_SECRET is not set (or too short). Generated ephemeral dev secret for current process.");
    return cachedJwtSecret;
}
// ===== Password hashing (без внешних зависимостей) =====
const SCRYPT_N = 16384, SCRYPT_r = 8, SCRYPT_p = 1;
const KEYLEN = 64;
async function hashPassword(password) {
    const salt = crypto_1.default.randomBytes(16).toString("hex");
    const derived = await new Promise((resolve, reject) => crypto_1.default.scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }, (err, buf) => {
        if (err)
            reject(err);
        else
            resolve(buf);
    }));
    return `scrypt$${salt}$${derived.toString("hex")}`;
}
exports.hashPassword = hashPassword;
async function verifyPassword(password, stored) {
    try {
        const [alg, salt, hashHex] = stored.split("$");
        if (alg !== "scrypt" || !salt || !hashHex)
            return false;
        const derived = await new Promise((resolve, reject) => crypto_1.default.scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }, (err, buf) => {
            if (err)
                reject(err);
            else
                resolve(buf);
        }));
        const hashBuffer = Buffer.from(hashHex, "hex");
        return crypto_1.default.timingSafeEqual(hashBuffer, derived);
    }
    catch {
        return false;
    }
}
exports.verifyPassword = verifyPassword;
// ===== JWT =====
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn: "30d",
        algorithm: "HS256",
        issuer: JWT_ISSUER,
    });
}
exports.signToken = signToken;
function requireAuth(req, res, next) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) {
        console.log(`[AUTH] No token for ${req.method} ${req.path}`);
        return res.status(401).json({ error: "unauthorized" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret(), {
            algorithms: ["HS256"],
            issuer: JWT_ISSUER,
        });
        if (typeof decoded !== "object" || decoded == null) {
            return res.status(401).json({ error: "unauthorized" });
        }
        const id = Number(decoded.id);
        const username = String(decoded.username || "").trim().toLowerCase();
        if (!Number.isInteger(id) || id <= 0 || username.length < 1) {
            return res.status(401).json({ error: "unauthorized" });
        }
        req.user = { id, username };
        console.log(`[AUTH] Authenticated user ${decoded.id} (${decoded.username}) for ${req.method} ${req.path}`);
        next();
    }
    catch (err) {
        console.log(`[AUTH] Invalid token for ${req.method} ${req.path}:`, err);
        return res.status(401).json({ error: "unauthorized" });
    }
}
exports.requireAuth = requireAuth;
