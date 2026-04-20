import { Router, Request, Response } from 'express';
import pool from '../config/db.js';
import { validateFlashcard } from '../middleware/validate.js';
import { verifyDeckOwnership } from '../utils/deck-ownership.js';

const router = Router();

// GET /api/decks/:deckId/flashcards
router.get('/decks/:deckId/flashcards', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await verifyDeckOwnership(req.params.deckId, req.user!.userId, res)) return;

    const result = await pool.query(
      'SELECT id, question_type, question, answer, options, created_at FROM flashcards WHERE deck_id = $1 ORDER BY created_at',
      [req.params.deckId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/decks/:deckId/flashcards
router.post('/decks/:deckId/flashcards', validateFlashcard, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await verifyDeckOwnership(req.params.deckId, req.user!.userId, res)) return;

    const { question_type, question, answer, options } = req.body;
    const result = await pool.query(
      'INSERT INTO flashcards (deck_id, question_type, question, answer, options) VALUES ($1, $2, $3, $4, $5) RETURNING id, question_type, question, answer, options, created_at',
      [req.params.deckId, question_type, question.trim(), answer.trim(), options ? JSON.stringify(options) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create flashcard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/flashcards/:id
router.put('/flashcards/:id', validateFlashcard, async (req: Request, res: Response): Promise<void> => {
  try {
    const { question_type, question, answer, options } = req.body;
    const result = await pool.query(
      `UPDATE flashcards SET question_type = $1, question = $2, answer = $3, options = $4
       WHERE id = $5 AND deck_id IN (SELECT id FROM decks WHERE user_id = $6)
       RETURNING id, question_type, question, answer, options, created_at`,
      [question_type, question.trim(), answer.trim(), options ? JSON.stringify(options) : null, req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update flashcard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/flashcards/:id
router.delete('/flashcards/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM flashcards WHERE id = $1 AND deck_id IN (SELECT id FROM decks WHERE user_id = $2) RETURNING id',
      [req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }
    res.json({ message: 'Flashcard deleted' });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
