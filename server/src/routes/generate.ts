import { Router, Request, Response } from 'express';
import pool from '../config/db.js';
import { generateFlashcards, generateQuizQuestions } from '../services/ai.js';

const router = Router();

const MIN_GENERATION_COUNT = 1;
const MAX_GENERATION_COUNT = 20;

// POST /api/decks/:deckId/generate/flashcards
router.post('/decks/:deckId/generate/flashcards', async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId, count = 5 } = req.body;

    if (!noteId || typeof noteId !== 'number') {
      res.status(400).json({ error: 'noteId is required' });
      return;
    }
    if (typeof count !== 'number' || count < MIN_GENERATION_COUNT || count > MAX_GENERATION_COUNT) {
      res.status(400).json({ error: `count must be between ${MIN_GENERATION_COUNT} and ${MAX_GENERATION_COUNT}` });
      return;
    }

    const deckCheck = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.deckId, req.user!.userId]
    );
    if (deckCheck.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const noteCheck = await pool.query(
      `SELECT n.content FROM notes n
       JOIN decks d ON d.id = n.deck_id
       WHERE n.id = $1 AND d.user_id = $2`,
      [noteId, req.user!.userId]
    );
    if (noteCheck.rows.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const noteContent = noteCheck.rows[0].content;
    const generated = await generateFlashcards(noteContent, count);

    const insertedCards = [];
    for (const card of generated) {
      const result = await pool.query(
        'INSERT INTO flashcards (deck_id, question_type, question, answer, options) VALUES ($1, $2, $3, $4, $5) RETURNING id, question_type, question, answer, options, created_at',
        [req.params.deckId, card.question_type, card.question, card.answer, card.options ? JSON.stringify(card.options) : null]
      );
      insertedCards.push(result.rows[0]);
    }

    res.status(201).json({ flashcards: insertedCards });
  } catch (error: any) {
    if (error.message?.includes('HUGGINGFACE_API_KEY')) {
      res.status(503).json({ error: 'AI service is not configured' });
      return;
    }
    if (error.message?.includes('AI could not generate')) {
      res.status(422).json({ error: error.message });
      return;
    }
    console.error('Generate flashcards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/decks/:deckId/generate/quiz
router.post('/decks/:deckId/generate/quiz', async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId, title, questionCount = 5 } = req.body;

    if (!noteId || typeof noteId !== 'number') {
      res.status(400).json({ error: 'noteId is required' });
      return;
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (typeof questionCount !== 'number' || questionCount < MIN_GENERATION_COUNT || questionCount > MAX_GENERATION_COUNT) {
      res.status(400).json({ error: `questionCount must be between ${MIN_GENERATION_COUNT} and ${MAX_GENERATION_COUNT}` });
      return;
    }

    const deckCheck = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.deckId, req.user!.userId]
    );
    if (deckCheck.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const noteCheck = await pool.query(
      `SELECT n.content FROM notes n
       JOIN decks d ON d.id = n.deck_id
       WHERE n.id = $1 AND d.user_id = $2`,
      [noteId, req.user!.userId]
    );
    if (noteCheck.rows.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const noteContent = noteCheck.rows[0].content;
    const generated = await generateQuizQuestions(noteContent, questionCount);

    const quizResult = await pool.query(
      'INSERT INTO quizzes (deck_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
      [req.params.deckId, title.trim()]
    );
    const quiz = quizResult.rows[0];

    const insertedQuestions = [];
    for (const q of generated) {
      const result = await pool.query(
        'INSERT INTO quiz_questions (quiz_id, question_type, question, answer, options) VALUES ($1, $2, $3, $4, $5) RETURNING id, question_type, question, answer, options, created_at',
        [quiz.id, q.question_type, q.question, q.answer, q.options ? JSON.stringify(q.options) : null]
      );
      insertedQuestions.push(result.rows[0]);
    }

    res.status(201).json({ quiz, questions: insertedQuestions });
  } catch (error: any) {
    if (error.message?.includes('HUGGINGFACE_API_KEY')) {
      res.status(503).json({ error: 'AI service is not configured' });
      return;
    }
    if (error.message?.includes('AI could not generate')) {
      res.status(422).json({ error: error.message });
      return;
    }
    console.error('Generate quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
