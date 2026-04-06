"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.signToken = signToken;
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
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
    // Не падаем: локально часто NODE_ENV=production без .env (Windows и т.д.)
    // На хостинге JWT_SECRET обычно задан в панели — тогда используется ветка выше.
    if (process.env.NODE_ENV === "production") {
        console.warn("[AUTH] JWT_SECRET не задан или короче 32 символов — временный ключ для этого процесса. " +
            "Для локального теста без .env это нормально; на проде задайте JWT_SECRET в окружении.");
    }
    else {
        console.warn("[AUTH] JWT_SECRET is not set (or too short). Generated ephemeral dev secret for current process.");
    }
    cachedJwtSecret = crypto_1.default.randomBytes(48).toString("hex");
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
// ===== JWT =====
function buildAuthBinding(userId, userCreatedAt, passwordHash) {
    return crypto_1.default
        .createHmac("sha256", getJwtSecret())
        .update(`${userId}:${userCreatedAt}:${passwordHash}`)
        .digest("base64url");
}
function safeStringEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && crypto_1.default.timingSafeEqual(leftBuffer, rightBuffer);
}
function signToken(payload) {
    const { passwordHash, ...tokenPayload } = payload;
    return jsonwebtoken_1.default.sign({
        ...tokenPayload,
        authBinding: buildAuthBinding(payload.id, payload.userCreatedAt, passwordHash),
    }, getJwtSecret(), {
        expiresIn: "30d",
        algorithm: "HS256",
        issuer: JWT_ISSUER,
    });
}
function getTokenBoundUser(id, userCreatedAt) {
    return db_1.db.prepare(`
    SELECT u.id, u.createdAt, u.passwordHash, p.username
    FROM User u
    LEFT JOIN Profile p ON p.userId = u.id
    WHERE u.id = ? AND u.createdAt = ?
  `).get(id, userCreatedAt);
}
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
        const userCreatedAt = String(decoded.userCreatedAt || "");
        const authBinding = String(decoded.authBinding || "");
        if (!Number.isInteger(id) || id <= 0 || username.length < 1 || userCreatedAt.length < 1 || authBinding.length < 1) {
            return res.status(401).json({ error: "unauthorized" });
        }
        const user = getTokenBoundUser(id, userCreatedAt);
        const expectedAuthBinding = user ? buildAuthBinding(user.id, user.createdAt, user.passwordHash) : "";
        if (!user || !safeStringEqual(authBinding, expectedAuthBinding)) {
            return res.status(401).json({ error: "unauthorized" });
        }
        const currentUsername = String(user.username || username).trim().toLowerCase();
        req.user = { id, username: currentUsername, userCreatedAt };
        console.log(`[AUTH] Authenticated user ${id} (${currentUsername}) for ${req.method} ${req.path}`);
        next();
    }
    catch (err) {
        console.log(`[AUTH] Invalid token for ${req.method} ${req.path}:`, err);
        return res.status(401).json({ error: "unauthorized" });
    }
}
