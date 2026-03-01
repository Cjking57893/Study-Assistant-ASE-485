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

describe('GET /api/decks/:deckId/quizzes', () => {
  it('returns quizzes for a deck', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Quiz 1', created_at: new Date(), question_count: 5 }],
      });

    const res = await request(app)
      .get('/api/decks/1/quizzes')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Quiz 1');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/decks/999/quizzes')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/decks/:deckId/quizzes', () => {
  it('creates a quiz with questions', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Quiz 1', created_at: new Date() }] }) // quiz insert
      .mockResolvedValueOnce({ rows: [{ id: 1, question_type: 'multiple_choice', question: 'Q1', answer: 'A1', options: null, created_at: new Date() }] }); // question insert

    const res = await request(app)
      .post('/api/decks/1/quizzes')
      .set('Authorization', authHeader())
      .send({
        title: 'Quiz 1',
        questions: [{ question_type: 'multiple_choice', question: 'Q1', answer: 'A1' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Quiz 1');
    expect(res.body.questions).toHaveLength(1);
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/decks/1/quizzes')
      .set('Authorization', authHeader())
      .send({ questions: [{ question_type: 'multiple_choice', question: 'Q', answer: 'A' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Quiz title is required');
  });

  it('returns 400 for missing questions', async () => {
    const res = await request(app)
      .post('/api/decks/1/quizzes')
      .set('Authorization', authHeader())
      .send({ title: 'Quiz 1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('At least one question is required');
  });

  it('returns 400 for empty questions array', async () => {
    const res = await request(app)
      .post('/api/decks/1/quizzes')
      .set('Authorization', authHeader())
      .send({ title: 'Quiz 1', questions: [] });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid question type in questions', async () => {
    const res = await request(app)
      .post('/api/decks/1/quizzes')
      .set('Authorization', authHeader())
      .send({
        title: 'Quiz 1',
        questions: [{ question_type: 'invalid', question: 'Q', answer: 'A' }],
      });

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/decks/999/quizzes')
      .set('Authorization', authHeader())
      .send({
        title: 'Quiz 1',
        questions: [{ question_type: 'multiple_choice', question: 'Q', answer: 'A' }],
      });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/quizzes/:id', () => {
  it('returns quiz with questions', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Quiz 1', deck_id: 1, created_at: new Date() }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, question_type: 'multiple_choice', question: 'Q1', answer: 'A1', options: null }],
      });

    const res = await request(app)
      .get('/api/quizzes/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Quiz 1');
    expect(res.body.questions).toHaveLength(1);
  });

  it('returns 404 for non-existent quiz', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/quizzes/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/quizzes/:id', () => {
  it('deletes a quiz', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/quizzes/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quiz deleted');
  });

  it('returns 404 for non-existent quiz', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/quizzes/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});
