import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('express-rate-limit', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../config/db.js', () => ({
  default: { query: vi.fn() },
}));

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock('crypto', () => ({
  default: { randomBytes: vi.fn(() => ({ toString: () => 'mock-refresh-token' })) },
}));

import app from '../app.js';
import pool from '../config/db.js';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

function authHeader() {
  const token = jwt.sign({ userId: 1, email: 'test@test.com' }, process.env.JWT_SECRET!, { expiresIn: 900 });
  return `Bearer ${token}`;
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe('GET /api/decks/:deckId/flashcards', () => {
  it('returns flashcards for a deck', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({
        rows: [{ id: 1, question_type: 'fill_blank', question: 'What is 2+2?', answer: '4', options: null }],
      });

    const res = await request(app)
      .get('/api/decks/1/flashcards')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/decks/999/flashcards')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/decks/:deckId/flashcards', () => {
  it('creates a flashcard', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({
        rows: [{ id: 1, question_type: 'fill_blank', question: 'What is 2+2?', answer: '4', options: null, created_at: new Date() }],
      });

    const res = await request(app)
      .post('/api/decks/1/flashcards')
      .set('Authorization', authHeader())
      .send({ question_type: 'fill_blank', question: 'What is 2+2?', answer: '4' });

    expect(res.status).toBe(201);
    expect(res.body.question).toBe('What is 2+2?');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/decks/999/flashcards')
      .set('Authorization', authHeader())
      .send({ question_type: 'fill_blank', question: 'Q', answer: 'A' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid question_type', async () => {
    const res = await request(app)
      .post('/api/decks/1/flashcards')
      .set('Authorization', authHeader())
      .send({ question_type: 'invalid', question: 'Q', answer: 'A' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing question', async () => {
    const res = await request(app)
      .post('/api/decks/1/flashcards')
      .set('Authorization', authHeader())
      .send({ question_type: 'fill_blank', answer: 'A' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing answer', async () => {
    const res = await request(app)
      .post('/api/decks/1/flashcards')
      .set('Authorization', authHeader())
      .send({ question_type: 'fill_blank', question: 'Q' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/flashcards/:id', () => {
  it('updates a flashcard', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, question_type: 'true_false', question: 'Updated Q', answer: 'True', options: null, created_at: new Date() }],
    });

    const res = await request(app)
      .put('/api/flashcards/1')
      .set('Authorization', authHeader())
      .send({ question_type: 'true_false', question: 'Updated Q', answer: 'True' });

    expect(res.status).toBe(200);
    expect(res.body.question).toBe('Updated Q');
  });

  it('returns 404 for non-existent flashcard', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/flashcards/999')
      .set('Authorization', authHeader())
      .send({ question_type: 'fill_blank', question: 'Q', answer: 'A' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/flashcards/:id', () => {
  it('deletes a flashcard', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/flashcards/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Flashcard deleted');
  });

  it('returns 404 for non-existent flashcard', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/flashcards/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});
