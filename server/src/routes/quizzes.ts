import { Router, Request, Response } from 'express';
import pool from '../config/db.js';

const VALID_QUIZ_QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer'] as const;

const router = Router();

// GET /api/decks/:deckId/quizzes
router.get('/decks/:deckId/quizzes', async (req: Request, res: Response): Promise<void> => {
  try {
    const deckCheck = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.deckId, req.user!.userId]
    );
    if (deckCheck.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const result = await pool.query(
      `SELECT q.id, q.title, q.created_at,
              (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id)::int AS question_count
       FROM quizzes q WHERE q.deck_id = $1 ORDER BY q.created_at`,
      [req.params.deckId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/decks/:deckId/quizzes
router.post('/decks/:deckId/quizzes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, questions } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      res.status(400).json({ error: 'Quiz title is required' });
      return;
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'At least one question is required' });
      return;
    }

    for (const q of questions) {
      if (!q.question_type || !VALID_QUIZ_QUESTION_TYPES.includes(q.question_type)) {
        res.status(400).json({ error: `question_type must be one of: ${VALID_QUIZ_QUESTION_TYPES.join(', ')}` });
        return;
      }
      if (!q.question || typeof q.question !== 'string') {
        res.status(400).json({ error: 'Each question must have question text' });
        return;
      }
      if (!q.answer || typeof q.answer !== 'string') {
        res.status(400).json({ error: 'Each question must have an answer' });
        return;
      }
    }

    const deckCheck = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.deckId, req.user!.userId]
    );
    if (deckCheck.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const quizResult = await pool.query(
      'INSERT INTO quizzes (deck_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
      [req.params.deckId, title.trim()]
    );
    const quiz = quizResult.rows[0];

    const insertedQuestions = [];
    for (const q of questions) {
      const qResult = await pool.query(
        'INSERT INTO quiz_questions (quiz_id, question_type, question, answer, options) VALUES ($1, $2, $3, $4, $5) RETURNING id, question_type, question, answer, options, created_at',
        [quiz.id, q.question_type, q.question.trim(), q.answer.trim(), q.options ? JSON.stringify(q.options) : null]
      );
      insertedQuestions.push(qResult.rows[0]);
    }

    res.status(201).json({ ...quiz, questions: insertedQuestions });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quizzes/:id
router.get('/quizzes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizResult = await pool.query(
      `SELECT q.id, q.title, q.deck_id, q.created_at
       FROM quizzes q
       JOIN decks d ON d.id = q.deck_id
       WHERE q.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (quizResult.rows.length === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const questionsResult = await pool.query(
      'SELECT id, question_type, question, answer, options, created_at FROM quiz_questions WHERE quiz_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({ ...quizResult.rows[0], questions: questionsResult.rows });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/quizzes/:id
router.delete('/quizzes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM quizzes WHERE id = $1
       AND deck_id IN (SELECT id FROM decks WHERE user_id = $2)
       RETURNING id`,
      [req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
