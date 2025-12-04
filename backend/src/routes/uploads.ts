import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
  return res.json({ url: `/uploads/${file.filename}` });
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
