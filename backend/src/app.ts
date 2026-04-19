import express from "express";
import cors from "cors";
import path from "path";

// Роуты
import authRouter from "./routes/auth";
import userRouter from "./routes/user";
import blocksRouter from "./routes/blocks";
import publicRouter from "./routes/public";
import uploadsRouter from "./routes/uploads";
import profileRouter from "./routes/profile";
import metadataRouter from "./routes/metadata";
import qrRouter from "./routes/qr";

const app = express();

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
app.use(cors(corsOptions));


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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// TC-SYS-03: тело не JSON → 400 JSON (не HTML)
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const e = err as { status?: number; body?: unknown; type?: string };
  const isParse =
    e?.type === "entity.parse.failed" ||
    (err instanceof SyntaxError && typeof e?.status === "number" && e.status === 400 && "body" in e);
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
function getUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return process.env.UPLOAD_DIR;
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.DOCKER) {
    return '/tmp/uploads';
  }
  
  return path.join(process.cwd(), "uploads");
}

const uploadDir = getUploadDir();
console.log(`[APP] Serving uploads from: ${uploadDir}`);
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_, res) => res.json({ ok: true }));

// API
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/blocks", blocksRouter);
app.use("/api/public", publicRouter);
app.use("/api/storage", uploadsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/metadata", metadataRouter);
app.use("/api/qr", qrRouter);

// обработчик 404 для /api/*
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

// Глобальный обработчик ошибок — последний middleware
// Перехватывает ошибки из всех предыдущих middleware и роутов
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  
  // В production не показываем детали ошибки клиенту
  const status = err.status || 500;
  const message = (process.env.NODE_ENV === 'production' && status === 500)
    ? 'internal_error'
    : err.message || 'internal_error';
  
  res.status(status).json({ error: message });
});

export default app;
