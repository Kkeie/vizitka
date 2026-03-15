"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importStar(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
// На Render используем /tmp/uploads для сохранения файлов
// В Docker или локально используем ./uploads
function getUploadDir() {
    if (process.env.UPLOAD_DIR) {
        return process.env.UPLOAD_DIR;
    }
    // На Render (production без Docker) используем /tmp/uploads
    if (process.env.NODE_ENV === 'production' && !process.env.DOCKER) {
        const tmpDir = '/tmp/uploads';
        if (!fs_1.default.existsSync(tmpDir)) {
            fs_1.default.mkdirSync(tmpDir, { recursive: true });
        }
        return tmpDir;
    }
    // В Docker или локально используем ./uploads
    const uploadDir = path_1.default.resolve(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
}
const UPLOAD_DIR = getUploadDir();
console.log(`[UPLOAD] Upload directory: ${UPLOAD_DIR}`);
function sanitizeFilename(name) {
    return name.replace(/[^\w.\-]+/g, '_');
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const base = path_1.default.basename(file.originalname, ext);
        cb(null, `${Date.now()}_${sanitizeFilename(base)}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Unsupported file type'));
        }
    },
});
// Принимаем ЛЮБОЕ имя поля (file, image, photo, avatar, upload и т.д.)
const uploadAny = upload.any();
function pickFirstFile(req) {
    // multer.any() кладёт файлы в req.files (массив)
    const files = req.files;
    if (files && files.length > 0)
        return files[0];
    // на всякий случай — если кто-то использует single()
    // @ts-ignore
    if (req.file)
        return req.file;
    return null;
}
function respondWithFile(res, file) {
    if (!file)
        return res.status(400).json({ error: 'no_file' });
    // Логируем успешную загрузку
    console.log(`[UPLOAD] File uploaded: ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    // В Docker всегда отдаём относительный путь, чтобы работать через nginx фронтенда
    if (process.env.DOCKER) {
        const url = `/uploads/${file.filename}`;
        console.log(`[UPLOAD] Returning URL (DOCKER): ${url}`);
        return res.json({ url });
    }
    // Возвращаем полный URL или относительный путь в зависимости от окружения
    // На Render используем BACKEND_URL из переменных окружения или формируем из запроса
    const baseUrl = process.env.BACKEND_URL || '';
    let url;
    if (baseUrl) {
        // Если указан BACKEND_URL, используем его
        url = `${baseUrl}/uploads/${file.filename}`;
    }
    else {
        // Иначе формируем из запроса (для локальной разработки и Render)
        const protocol = res.req.headers['x-forwarded-proto'] || 'https';
        const host = res.req.headers.host || 'localhost:3000';
        // На Render всегда используем https
        const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
        if (isRender) {
            url = `https://${host}/uploads/${file.filename}`;
        }
        else {
            url = `/uploads/${file.filename}`;
        }
    }
    console.log(`[UPLOAD] Returning URL: ${url}`);
    return res.json({ url });
}
function multerErrorHandler(err, _req, res, _next) {
    if (err instanceof multer_1.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'file_too_large' });
        }
        return res.status(400).json({ error: err.code });
    }
    if (err) {
        return res.status(400).json({ error: err.message || 'upload_error' });
    }
    return res.status(500).json({ error: 'internal' });
}
// Совместимость со старым фронтом: POST /api/storage/upload
router.post('/upload', auth_1.requireAuth, uploadAny, (req, res) => {
    const file = pickFirstFile(req);
    return respondWithFile(res, file);
});
// Явные маршруты (тоже принимают любое имя поля)
router.post('/image', auth_1.requireAuth, uploadAny, (req, res) => {
    const file = pickFirstFile(req);
    return respondWithFile(res, file);
});
router.post('/video', auth_1.requireAuth, uploadAny, (req, res) => {
    const file = pickFirstFile(req);
    return respondWithFile(res, file);
});
router.post('/audio', auth_1.requireAuth, uploadAny, (req, res) => {
    const file = pickFirstFile(req);
    return respondWithFile(res, file);
});
// общий обработчик ошибок Multer
router.use(multerErrorHandler);
exports.default = router;
