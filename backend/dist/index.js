"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "*", // можно ограничить, если нужно
    credentials: false
}));
app.use(express_1.default.json({ limit: "20mb" }));
// health
app.get("/api/health", (_req, res) => res.json({ ok: true }));
// auth
app.use("/api/auth", auth_1.default);
// статика для загруженных файлов, если используешь uploads
app.use("/uploads", express_1.default.static(path_1.default.join("/app/uploads")));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server on http://localhost:${port}`);
});
