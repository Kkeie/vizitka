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
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`, {
    origin: req.headers.origin,
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
  });
  next();
});

// Логирование ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

// обработчик 404 для /api/*
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

export default app;
