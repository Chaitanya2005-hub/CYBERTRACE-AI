import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { uploadRouter } from './routes/upload.js';
import { graphRouter } from './routes/graph.js';
import { reportRouter } from './routes/report.js';

const app = express();

// CORS — explicit origin, never wildcard with credentials
const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/graph', graphRouter);
app.use('/api/report', reportRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running and reaches Supabase.' });
});

// Global error handler — never leak internals to client
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
