import { Router, Request, Response } from 'express';
import pool from '../config/db.js';

const router = Router();

// POST /api/sessions
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { deck_id, total_cards, correct } = req.body;

    if (!deck_id || typeof deck_id !== 'number') {
      res.status(400).json({ error: 'deck_id is required' });
      return;
    }
    if (typeof total_cards !== 'number' || total_cards < 0) {
      res.status(400).json({ error: 'total_cards must be a non-negative number' });
      return;
    }
    if (typeof correct !== 'number' || correct < 0) {
      res.status(400).json({ error: 'correct must be a non-negative number' });
      return;
    }
    if (correct > total_cards) {
      res.status(400).json({ error: 'correct cannot exceed total_cards' });
      return;
    }

    const deckCheck = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [deck_id, req.user!.userId]
    );
    if (deckCheck.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO study_sessions (user_id, deck_id, total_cards, correct) VALUES ($1, $2, $3, $4) RETURNING id, deck_id, total_cards, correct, completed_at',
      [req.user!.userId, deck_id, total_cards, correct]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT ss.id, ss.deck_id, ss.total_cards, ss.correct, ss.completed_at,
              d.title AS deck_title
       FROM study_sessions ss
       JOIN decks d ON d.id = ss.deck_id
       WHERE ss.user_id = $1
       ORDER BY ss.completed_at DESC`,
      [req.user!.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
