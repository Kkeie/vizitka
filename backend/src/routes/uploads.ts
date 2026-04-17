import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fileType from 'file-type';
import { requireAuth } from '../utils/auth';

const router = Router();

// На Render используем /tmp/uploads для сохранения файлов
// В Docker или локально используем ./uploads
function getUploadDir(): string {
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
  const uploadDir = path.resolve(process.cwd(), 'uploads');
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

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// Принимаем ЛЮБОЕ имя поля (file, image, photo, avatar, upload и т.д.)
const uploadAny = upload.any();

async function saveValidatedFile(
  file: Express.Multer.File,
): Promise<{ filename: string; url: string }> {
  // Используем правильный метод из версии 16.x
  const detectedType = await fileType.fromBuffer(file.buffer);
  if (!detectedType) {
    throw new Error('Cannot detect file type');
  }

  if (!ALLOWED_MIME_TYPES.has(detectedType.mime)) {
    throw new Error(`Unsupported file type: ${detectedType.mime}`);
  }

  const originalExt = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, originalExt);
  const safeBase = baseName.replace(/[^\w\-]/g, '_');
  const filename = `${Date.now()}_${safeBase}${originalExt}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(fullPath, file.buffer);

  return { filename, url: `/uploads/${filename}` };
}

function buildPublicUrl(req: Request, filename: string): string {
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

async function handleUpload(req: Request, res: Response): Promise<void> {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const file = files?.[0];
  if (!file) {
    res.status(400).json({ error: 'no_file' });
    return;
  }

  try {
    const { filename, url: relativeUrl } = await saveValidatedFile(file);
    const publicUrl = buildPublicUrl(req, filename);
    console.log(`[UPLOAD] File saved: ${filename} (${(file.size / 1024 / 1024).toFixed(2)} MB), type: ${file.mimetype}`);
    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[UPLOAD] Validation error:', err.message);
    res.status(400).json({ error: err.message || 'invalid_file' });
  }
}

router.post('/upload', requireAuth, uploadAny, handleUpload);
router.post('/image', requireAuth, uploadAny, handleUpload);
router.post('/video', requireAuth, uploadAny, handleUpload);
router.post('/audio', requireAuth, uploadAny, handleUpload);

function multerErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof MulterError) {
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

export default router;