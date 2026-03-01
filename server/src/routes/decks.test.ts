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

describe('GET /api/decks', () => {
  it('returns user decks', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Calculus', description: null, category_name: 'Math', flashcard_count: 5, quiz_count: 1, last_studied: null }],
    });

    const res = await request(app)
      .get('/api/decks')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Calculus');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/decks');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/decks/:id', () => {
  it('returns deck with flashcards, quizzes, and notes', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Calculus', description: 'Calc I', category_id: 1, category_name: 'Math', created_at: new Date(), updated_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 1, question: 'What is 2+2?', answer: '4' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/decks/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Calculus');
    expect(res.body.flashcards).toHaveLength(1);
    expect(res.body.quizzes).toHaveLength(0);
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/decks/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/decks', () => {
  it('creates a deck', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Calculus', description: null, category_id: null, created_at: new Date(), updated_at: new Date() }],
    });

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader())
      .send({ title: 'Calculus' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Calculus');
  });

  it('creates a deck with category', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // category check
      .mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Calculus', description: null, category_id: 1, created_at: new Date(), updated_at: new Date() }],
      });

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader())
      .send({ title: 'Calculus', category_id: 1 });

    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // category check fails

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader())
      .send({ title: 'Calculus', category_id: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid category');
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader())
      .send({ title: 'Calculus' });

    expect(res.status).toBe(500);
  });
});

describe('PUT /api/decks/:id', () => {
  it('updates a deck', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Updated', description: null, category_id: null, created_at: new Date(), updated_at: new Date() }],
    });

    const res = await request(app)
      .put('/api/decks/1')
      .set('Authorization', authHeader())
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/decks/999')
      .set('Authorization', authHeader())
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/decks/:id', () => {
  it('deletes a deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/decks/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deck deleted');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/decks/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});
