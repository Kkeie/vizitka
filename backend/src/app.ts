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

const app = express();

// CORS настройки для production и development
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://localhost:8080'], // по умолчанию для dev
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// статика для загруженных файлов
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_, res) => res.json({ ok: true }));

// API
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/blocks", blocksRouter);
app.use("/api/public", publicRouter);
app.use("/api/storage", uploadsRouter);
app.use("/api/profile", profileRouter);

// обработчик 404 для /api/*
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

export default app;
