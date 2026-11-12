import express, { type NextFunction, type Request, type Response } from 'express';
import { router } from './routes.js';
import { HttpError } from './errors.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: '100kb' }));

// Request log (dev-friendly)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', router);

// 404 for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
});

// Central error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error('[unhandled]', err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong' },
  });
});

app.listen(PORT, () => {
  console.log(`✓ CRUD API listening on http://localhost:${PORT}`);
});
