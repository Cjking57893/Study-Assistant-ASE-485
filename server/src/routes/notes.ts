import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
import pool from '../config/db.js';

const router = Router();

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt, .pdf, and .docx files are allowed'));
    }
  },
});

async function extractText(file: Express.Multer.File): Promise<string> {
  switch (file.mimetype) {
    case 'text/plain':
      return file.buffer.toString('utf-8');
    case 'application/pdf': {
      const pdfData = await pdfParse(file.buffer);
      return pdfData.text;
    }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    }
    default:
      throw new Error('Unsupported file type');
  }
}

// POST /api/decks/:deckId/notes/upload
router.post('/decks/:deckId/notes/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
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

    const content = await extractText(req.file);

    if (!content.trim()) {
      res.status(400).json({ error: 'No text content could be extracted from the file' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO notes (deck_id, original_filename, content) VALUES ($1, $2, $3) RETURNING id, original_filename, content, created_at',
      [req.params.deckId, req.file.originalname, content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.message?.includes('Only .txt')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Upload note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/decks/:deckId/notes
router.get('/decks/:deckId/notes', async (req: Request, res: Response): Promise<void> => {
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
      'SELECT id, original_filename, content, created_at FROM notes WHERE deck_id = $1 ORDER BY created_at',
      [req.params.deckId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notes/:id
router.get('/notes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.original_filename, n.content, n.created_at
       FROM notes n
       JOIN decks d ON d.id = n.deck_id
       WHERE n.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notes/:id
router.delete('/notes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM notes WHERE id = $1
       AND deck_id IN (SELECT id FROM decks WHERE user_id = $2)
       RETURNING id`,
      [req.params.id, req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
