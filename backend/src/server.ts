import app from "./app";

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
  // Слушаем на 0.0.0.0 чтобы принимать соединения извне контейнера
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Server started successfully on http://0.0.0.0:${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Database path: ${process.env.DATABASE_PATH || 'default'}`);
    console.log(`[SERVER] PORT from env: ${process.env.PORT || 'not set'}`);
  });
} catch (error) {
  console.error('[SERVER] Failed to start server:', error);
  process.exit(1);
}
