"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
// Роуты
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const blocks_1 = __importDefault(require("./routes/blocks"));
const public_1 = __importDefault(require("./routes/public"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const profile_1 = __importDefault(require("./routes/profile"));
const metadata_1 = __importDefault(require("./routes/metadata"));
const qr_1 = __importDefault(require("./routes/qr"));
const stats_1 = __importDefault(require("./routes/stats"));
const app = (0, express_1.default)();
// CORS настройки для production и development
// Временно разрешаем все origins для отладки, потом можно ограничить
const corsOptions = {
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
        : true, // Разрешаем все origins если FRONTEND_URL не установлен
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
// Логирование всех запросов для отладки
app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.path}`, {
        origin: req.headers.origin,
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
    });
    next();
});
// Парсеры JSON и urlencoded
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// TC-SYS-03: тело не JSON → 400 JSON (не HTML)
app.use((err, _req, res, next) => {
    const e = err;
    const isParse = (e === null || e === void 0 ? void 0 : e.type) === "entity.parse.failed" ||
        (err instanceof SyntaxError && typeof (e === null || e === void 0 ? void 0 : e.status) === "number" && e.status === 400 && "body" in e);
    if (isParse) {
        const message = err instanceof Error ? err.message : "Invalid JSON";
        return res.status(400).json({ error: "invalid_json", message });
    }
    next(err);
});
// Никогда не кешируем приватные ответы, зависящие от bearer token.
app.use("/api", (req, res, next) => {
    if (req.headers.authorization) {
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Vary", "Authorization");
    }
    next();
});
// статика для загруженных файлов
// На Render используем /tmp/uploads, в Docker/локально - ./uploads
function getUploadDir() {
    if (process.env.UPLOAD_DIR) {
        return process.env.UPLOAD_DIR;
    }
    if (process.env.NODE_ENV === 'production' && !process.env.DOCKER) {
        return '/tmp/uploads';
    }
    return path_1.default.join(process.cwd(), "uploads");
}
const uploadDir = getUploadDir();
console.log(`[APP] Serving uploads from: ${uploadDir}`);
app.use("/uploads", express_1.default.static(uploadDir));
app.get("/api/health", (_, res) => res.json({ ok: true }));
/** Без секретов: проверка, что в рантайме заданы переменные для исходящей почты (удобно без доступа к облаку). */
app.get("/api/health/mail", (_, res) => {
    var _a, _b, _c, _d, _e, _f;
    const host = (_a = process.env.SMTP_HOST) === null || _a === void 0 ? void 0 : _a.trim();
    const user = (_b = process.env.SMTP_USER) === null || _b === void 0 ? void 0 : _b.trim();
    const pass = (_c = process.env.SMTP_PASS) === null || _c === void 0 ? void 0 : _c.trim();
    const from = (process.env.EMAIL_FROM || process.env.SMTP_FROM || user || "").trim();
    const linkBase = ((_d = process.env.FRONTEND_APP_URL) === null || _d === void 0 ? void 0 : _d.trim()) ||
        ((_f = (_e = process.env.FRONTEND_URL) === null || _e === void 0 ? void 0 : _e.split(",")[0]) === null || _f === void 0 ? void 0 : _f.trim()) ||
        "";
    const smtpHostSet = Boolean(host);
    const smtpAuthSet = Boolean(user && pass);
    const emailFromSet = Boolean(from);
    const verificationLinkBaseSet = Boolean(linkBase);
    res.json({
        ok: true,
        smtpHostSet,
        smtpAuthSet,
        emailFromSet,
        verificationLinkBaseSet,
        readyToSend: smtpHostSet && smtpAuthSet && emailFromSet && verificationLinkBaseSet,
    });
});
// API
app.use("/api/auth", auth_1.default);
app.use("/api/user", user_1.default);
app.use("/api/blocks", blocks_1.default);
app.use("/api/public", public_1.default);
app.use("/api/storage", uploads_1.default);
app.use("/api/profile", profile_1.default);
app.use("/api/metadata", metadata_1.default);
app.use("/api/qr", qr_1.default);
app.use("/api/stats", stats_1.default);
// обработчик 404 для /api/*
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
// Глобальный обработчик ошибок — последний middleware
// Перехватывает ошибки из всех предыдущих middleware и роутов
app.use((err, req, res, _next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
    // В production не показываем детали ошибки клиенту
    const status = err.status || 500;
    const message = (process.env.NODE_ENV === 'production' && status === 500)
        ? 'internal_error'
        : err.message || 'internal_error';
    res.status(status).json({ error: message });
});
exports.default = app;
