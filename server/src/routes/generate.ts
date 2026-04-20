import { Router, Request, Response } from 'express';
import { generateFlashcards, generateQuizQuestions } from '../services/ai.js';
import { verifyDeckOwnership, fetchNoteContent, handleAiError } from '../utils/deck-ownership.js';
import pool from '../config/db.js';

const router = Router();

const MIN_GENERATION_COUNT = 1;
const MAX_GENERATION_COUNT = 20;

function validateGenerationCount(count: number, fieldName: string, res: Response): boolean {
  if (typeof count !== 'number' || count < MIN_GENERATION_COUNT || count > MAX_GENERATION_COUNT) {
    res.status(400).json({ error: `${fieldName} must be between ${MIN_GENERATION_COUNT} and ${MAX_GENERATION_COUNT}` });
    return false;
  }
  return true;
}

function validateNoteId(noteId: unknown, res: Response): noteId is number {
  if (!noteId || typeof noteId !== 'number') {
    res.status(400).json({ error: 'noteId is required' });
    return false;
  }
  return true;
}

// POST /api/decks/:deckId/generate/flashcards
router.post('/decks/:deckId/generate/flashcards', async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId, count = 5 } = req.body;

    if (!validateNoteId(noteId, res)) return;
    if (!validateGenerationCount(count, 'count', res)) return;
    if (!await verifyDeckOwnership(req.params.deckId, req.user!.userId, res)) return;

    const noteContent = await fetchNoteContent(noteId, req.user!.userId, res);
    if (!noteContent) return;

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
  } catch (error: unknown) {
    if (handleAiError(error, res)) return;
    console.error('Generate flashcards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/decks/:deckId/generate/quiz
router.post('/decks/:deckId/generate/quiz', async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId, title, questionCount = 5 } = req.body;

    if (!validateNoteId(noteId, res)) return;
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (!validateGenerationCount(questionCount, 'questionCount', res)) return;
    if (!await verifyDeckOwnership(req.params.deckId, req.user!.userId, res)) return;

    const noteContent = await fetchNoteContent(noteId, req.user!.userId, res);
    if (!noteContent) return;

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
  } catch (error: unknown) {
    if (handleAiError(error, res)) return;
    console.error('Generate quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
