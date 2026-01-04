"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 3000;
// Обработка ошибок при запуске сервера
process.on('uncaughtException', (error) => {
    console.error('[SERVER] Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
try {
    app_1.default.listen(PORT, () => {
        console.log(`[SERVER] Server started successfully on http://localhost:${PORT}`);
        console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[SERVER] Database path: ${process.env.DATABASE_PATH || 'default'}`);
    });
}
catch (error) {
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1);
}
