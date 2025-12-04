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
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// статика для загруженных файлов
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
app.get("/api/health", (_, res) => res.json({ ok: true }));
// API
app.use("/api/auth", auth_1.default);
app.use("/api/user", user_1.default);
app.use("/api/blocks", blocks_1.default);
app.use("/api/public", public_1.default);
app.use("/api/storage", uploads_1.default);
app.use("/api/profile", profile_1.default);
// обработчик 404 для /api/*
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
exports.default = app;
