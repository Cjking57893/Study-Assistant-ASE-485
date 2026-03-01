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

describe('POST /api/sessions', () => {
  it('records a study session', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({
        rows: [{ id: 1, deck_id: 1, total_cards: 10, correct: 8, completed_at: new Date() }],
      });

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', authHeader())
      .send({ deck_id: 1, total_cards: 10, correct: 8 });

    expect(res.status).toBe(201);
    expect(res.body.total_cards).toBe(10);
    expect(res.body.correct).toBe(8);
  });

  it('returns 400 for missing deck_id', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', authHeader())
      .send({ total_cards: 10, correct: 8 });

    expect(res.status).toBe(400);
  });

  it('returns 400 for negative total_cards', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', authHeader())
      .send({ deck_id: 1, total_cards: -1, correct: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when correct exceeds total_cards', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', authHeader())
      .send({ deck_id: 1, total_cards: 5, correct: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('correct cannot exceed total_cards');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', authHeader())
      .send({ deck_id: 999, total_cards: 10, correct: 8 });

    expect(res.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', authHeader())
      .send({ deck_id: 1, total_cards: 10, correct: 8 });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/sessions', () => {
  it('returns study history', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, deck_id: 1, total_cards: 10, correct: 8, completed_at: new Date(), deck_title: 'Calculus' },
      ],
    });

    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].deck_title).toBe('Calculus');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .get('/api/sessions')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
  });
});
