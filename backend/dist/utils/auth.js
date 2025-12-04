"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.signToken = exports.verifyPassword = exports.hashPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
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
        return crypto_1.default.timingSafeEqual(Buffer.from(hashHex, "hex"), derived);
    }
    catch {
        return false;
    }
}
exports.verifyPassword = verifyPassword;
// ===== JWT =====
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}
exports.signToken = signToken;
function requireAuth(req, res, next) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: "unauthorized" });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { id: decoded.id, username: decoded.username };
        next();
    }
    catch {
        return res.status(401).json({ error: "unauthorized" });
    }
}
exports.requireAuth = requireAuth;
