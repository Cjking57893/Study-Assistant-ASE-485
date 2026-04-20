import { Response } from 'express';
import pool from '../config/db.js';

export async function verifyDeckOwnership(
  deckId: string | string[] | number,
  userId: number,
  res: Response
): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
    [deckId, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Deck not found' });
    return false;
  }
  return true;
}

export async function fetchNoteContent(
  noteId: number,
  userId: number,
  res: Response
): Promise<string | null> {
  const result = await pool.query(
    `SELECT n.content FROM notes n
     JOIN decks d ON d.id = n.deck_id
     WHERE n.id = $1 AND d.user_id = $2`,
    [noteId, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Note not found' });
    return null;
  }
  return result.rows[0].content;
}

export function handleAiError(error: unknown, res: Response): boolean {
  if (error instanceof Error && error.message?.includes('HUGGINGFACE_API_KEY')) {
    res.status(503).json({ error: 'AI service is not configured' });
    return true;
  }
  if (error instanceof Error && error.message?.includes('AI could not generate')) {
    res.status(422).json({ error: error.message });
    return true;
  }
  return false;
}
