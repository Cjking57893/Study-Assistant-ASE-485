import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import deckRoutes from './routes/decks.js';
import flashcardRoutes from './routes/flashcards.js';
import quizRoutes from './routes/quizzes.js';
import sessionRoutes from './routes/sessions.js';
import noteRoutes from './routes/notes.js';
import generateRoutes from './routes/generate.js';
import { authenticateToken } from './middleware/auth.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/decks', authenticateToken, deckRoutes);
app.use('/api', authenticateToken, flashcardRoutes);
app.use('/api', authenticateToken, quizRoutes);
app.use('/api/sessions', authenticateToken, sessionRoutes);
app.use('/api', authenticateToken, noteRoutes);
app.use('/api', authenticateToken, generateRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../../dist')));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

export default app;
