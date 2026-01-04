import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';

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
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
  
  // В Docker или локально используем ./uploads
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

const UPLOAD_DIR = getUploadDir();
console.log(`[UPLOAD] Upload directory: ${UPLOAD_DIR}`);

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, '_');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${Date.now()}_${sanitizeFilename(base)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
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

function pickFirstFile(req: Request): Express.Multer.File | null {
  // multer.any() кладёт файлы в req.files (массив)
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) return files[0];

  // на всякий случай — если кто-то использует single()
  // @ts-ignore
  if ((req as any).file) return (req as any).file as Express.Multer.File;

  return null;
}

function respondWithFile(res: Response, file: Express.Multer.File | null) {
  if (!file) return res.status(400).json({ error: 'no_file' });
  
  // Логируем успешную загрузку
  console.log(`[UPLOAD] File uploaded: ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  // Возвращаем полный URL или относительный путь в зависимости от окружения
  // На Render используем BACKEND_URL из переменных окружения или формируем из запроса
  const baseUrl = process.env.BACKEND_URL || '';
  let url: string;
  
  if (baseUrl) {
    // Если указан BACKEND_URL, используем его
    url = `${baseUrl}/uploads/${file.filename}`;
  } else {
    // Иначе формируем из запроса (для локальной разработки и Render)
    const protocol = res.req.headers['x-forwarded-proto'] || 'https';
    const host = res.req.headers.host || 'localhost:3000';
    // На Render всегда используем https
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    if (isRender) {
      url = `https://${host}/uploads/${file.filename}`;
    } else {
      url = `/uploads/${file.filename}`;
    }
  }
  
  console.log(`[UPLOAD] Returning URL: ${url}`);
  return res.json({ url });
}

function multerErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
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

// Совместимость со старым фронтом: POST /api/storage/upload
router.post('/upload', uploadAny, (req: Request, res: Response) => {
  const file = pickFirstFile(req);
  return respondWithFile(res, file);
});

// Явные маршруты (тоже принимают любое имя поля)
router.post('/image', uploadAny, (req: Request, res: Response) => {
  const file = pickFirstFile(req);
  return respondWithFile(res, file);
});

router.post('/video', uploadAny, (req: Request, res: Response) => {
  const file = pickFirstFile(req);
  return respondWithFile(res, file);
});

router.post('/audio', uploadAny, (req: Request, res: Response) => {
  const file = pickFirstFile(req);
  return respondWithFile(res, file);
});

// общий обработчик ошибок Multer
router.use(multerErrorHandler);

export default router;
