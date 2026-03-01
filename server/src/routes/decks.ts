import { Router, Request, Response } from 'express';
import pool from '../config/db.js';
import { validateDeck } from '../middleware/validate.js';

const router = Router();

// GET /api/decks
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.title, d.description, d.category_id, d.created_at, d.updated_at,
              c.name AS category_name,
              (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id)::int AS flashcard_count,
              (SELECT COUNT(*) FROM quizzes q WHERE q.deck_id = d.id)::int AS quiz_count,
              (SELECT MAX(ss.completed_at) FROM study_sessions ss WHERE ss.deck_id = d.id) AS last_studied
       FROM decks d
       LEFT JOIN categories c ON c.id = d.category_id
       WHERE d.user_id = $1
       ORDER BY d.updated_at DESC`,
      [req.user!.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get decks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/decks/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const deckResult = await pool.query(
      `SELECT d.id, d.title, d.description, d.category_id, d.created_at, d.updated_at,
              c.name AS category_name
       FROM decks d
       LEFT JOIN categories c ON c.id = d.category_id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (deckResult.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    const deck = deckResult.rows[0];

    const [flashcardsResult, quizzesResult, notesResult] = await Promise.all([
      pool.query('SELECT id, question_type, question, answer, options, created_at FROM flashcards WHERE deck_id = $1 ORDER BY created_at', [deck.id]),
      pool.query('SELECT id, title, created_at FROM quizzes WHERE deck_id = $1 ORDER BY created_at', [deck.id]),
      pool.query('SELECT id, original_filename, created_at FROM notes WHERE deck_id = $1 ORDER BY created_at', [deck.id]),
    ]);

    res.json({
      ...deck,
      flashcards: flashcardsResult.rows,
      quizzes: quizzesResult.rows,
      notes: notesResult.rows,
    });
  } catch (error) {
    console.error('Get deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/decks
router.post('/', validateDeck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category_id } = req.body;

    if (category_id) {
      const catCheck = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, req.user!.userId]
      );
      if (catCheck.rows.length === 0) {
        res.status(400).json({ error: 'Invalid category' });
        return;
      }
    }

    const result = await pool.query(
      'INSERT INTO decks (user_id, title, description, category_id) VALUES ($1, $2, $3, $4) RETURNING id, title, description, category_id, created_at, updated_at',
      [req.user!.userId, title.trim(), description?.trim() || null, category_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/decks/:id
router.put('/:id', validateDeck, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, category_id } = req.body;

    if (category_id) {
      const catCheck = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, req.user!.userId]
      );
      if (catCheck.rows.length === 0) {
        res.status(400).json({ error: 'Invalid category' });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE decks SET title = $1, description = $2, category_id = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING id, title, description, category_id, created_at, updated_at`,
      [title.trim(), description?.trim() || null, category_id || null, req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/decks/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }
    res.json({ message: 'Deck deleted' });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
