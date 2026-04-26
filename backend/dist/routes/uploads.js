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
const promises_1 = __importDefault(require("fs/promises"));
const file_type_1 = __importDefault(require("file-type"));
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
        if (!require('fs').existsSync(tmpDir)) {
            require('fs').mkdirSync(tmpDir, { recursive: true });
        }
        return tmpDir;
    }
    // В Docker или локально используем ./uploads
    const uploadDir = path_1.default.resolve(process.cwd(), 'uploads');
    if (!require('fs').existsSync(uploadDir)) {
        require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
}
const UPLOAD_DIR = getUploadDir();
console.log(`[UPLOAD] Upload directory: ${UPLOAD_DIR}`);
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
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
async function saveValidatedFile(file) {
    // Используем правильный метод из версии 16.x
    const detectedType = await file_type_1.default.fromBuffer(file.buffer);
    if (!detectedType) {
        throw new Error('Cannot detect file type');
    }
    if (!ALLOWED_MIME_TYPES.has(detectedType.mime)) {
        throw new Error(`Unsupported file type: ${detectedType.mime}`);
    }
    const originalExt = path_1.default.extname(file.originalname);
    const baseName = path_1.default.basename(file.originalname, originalExt);
    const safeBase = baseName.replace(/[^\w\-]/g, '_');
    const filename = `${Date.now()}_${safeBase}${originalExt}`;
    const fullPath = path_1.default.join(UPLOAD_DIR, filename);
    await promises_1.default.writeFile(fullPath, file.buffer);
    return { filename, url: `/uploads/${filename}` };
}
function buildPublicUrl(req, filename) {
    if (process.env.DOCKER) {
        return `/uploads/${filename}`;
    }
    // Возвращаем полный URL или относительный путь в зависимости от окружения
    // На Render используем BACKEND_URL из переменных окружения или формируем из запроса
    const baseUrl = process.env.BACKEND_URL || '';
    if (baseUrl) {
        return `${baseUrl}/uploads/${filename}`;
    }
    const host = req.headers.host || 'localhost:3000';
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    if (isRender) {
        return `https://${host}/uploads/${filename}`;
    }
    return `/uploads/${filename}`;
}
async function handleUpload(req, res) {
    const files = req.files;
    const file = files === null || files === void 0 ? void 0 : files[0];
    if (!file) {
        res.status(400).json({ error: 'no_file' });
        return;
    }
    try {
        const { filename, url: relativeUrl } = await saveValidatedFile(file);
        const publicUrl = buildPublicUrl(req, filename);
        console.log(`[UPLOAD] File saved: ${filename} (${(file.size / 1024 / 1024).toFixed(2)} MB), type: ${file.mimetype}`);
        res.json({ url: publicUrl });
    }
    catch (err) {
        console.error('[UPLOAD] Validation error:', err.message);
        res.status(400).json({ error: err.message || 'invalid_file' });
    }
}
router.post('/upload', auth_1.requireAuth, uploadAny, handleUpload);
router.post('/image', auth_1.requireAuth, uploadAny, handleUpload);
router.post('/video', auth_1.requireAuth, uploadAny, handleUpload);
router.post('/audio', auth_1.requireAuth, uploadAny, handleUpload);
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
router.use(multerErrorHandler);
exports.default = router;
