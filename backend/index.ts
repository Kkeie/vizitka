import express from 'express';
import cors from 'cors';
import path from 'path';
import { router as authRouter } from './routes/auth';
import { router as blocksRouter } from './routes/blocks';
import { router as publicRouter } from './routes/public';
import { router as uploadsRouter } from './routes/uploads';

const app = express();

// CORS
app.use(cors());

// JSON/x-www-form-urlencoded лимиты (для больших payload'ов, не multipart)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Статика: отдаем загруженные файлы
const uploadsDir = '/app/uploads';
app.use('/uploads', express.static(uploadsDir));

// Роуты API
app.use('/api/auth', authRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api', publicRouter);
app.use('/api/uploads', uploadsRouter);

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server on http://localhost:${port}`);
});
