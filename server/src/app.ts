import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import deckRoutes from './routes/decks.js';
import flashcardRoutes from './routes/flashcards.js';
import quizRoutes from './routes/quizzes.js';
import sessionRoutes from './routes/sessions.js';
import noteRoutes from './routes/notes.js';
import { authenticateToken } from './middleware/auth.js';

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
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

export default app;
