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

describe('GET /api/categories', () => {
  it('returns user categories', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Math', created_at: new Date() }],
    });

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Math');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/categories', () => {
  it('creates a category', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Science', created_at: new Date() }],
    });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', authHeader())
      .send({ name: 'Science' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Science');
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Category name is required');
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', authHeader())
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate name', async () => {
    mockQuery.mockRejectedValueOnce({ code: '23505' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', authHeader())
      .send({ name: 'Math' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', authHeader())
      .send({ name: 'Math' });

    expect(res.status).toBe(500);
  });
});

describe('PUT /api/categories/:id', () => {
  it('renames a category', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Physics', created_at: new Date() }],
    });

    const res = await request(app)
      .put('/api/categories/1')
      .set('Authorization', authHeader())
      .send({ name: 'Physics' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Physics');
  });

  it('returns 404 for non-existent category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/categories/999')
      .set('Authorization', authHeader())
      .send({ name: 'Physics' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app)
      .put('/api/categories/1')
      .set('Authorization', authHeader())
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate name', async () => {
    mockQuery.mockRejectedValueOnce({ code: '23505' });

    const res = await request(app)
      .put('/api/categories/1')
      .set('Authorization', authHeader())
      .send({ name: 'Math' });

    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('deletes a category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/categories/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Category deleted');
  });

  it('returns 404 for non-existent category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/categories/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .delete('/api/categories/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
  });
});
