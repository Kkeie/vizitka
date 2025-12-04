import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";

const app = express();

app.use(cors({
  origin: "*", // можно ограничить, если нужно
  credentials: false
}));
app.use(express.json({ limit: "20mb" }));

// health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// auth
app.use("/api/auth", authRoutes);

// статика для загруженных файлов, если используешь uploads
app.use("/uploads", express.static(path.join("/app/uploads")));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server on http://localhost:${port}`);
});
