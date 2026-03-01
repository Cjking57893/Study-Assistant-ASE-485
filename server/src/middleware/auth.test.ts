import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

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

import jwt from 'jsonwebtoken';
import app from '../app.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('authenticateToken middleware', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token is required');
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', 'Basic some-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token is required');
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired access token');
  });

  it('allows request with valid token', async () => {
    const token = jwt.sign(
      { userId: 1, email: 'test@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: 900 }
    );

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    // Should not be 401 — might be 200 or 500 (db not mocked for this specific call)
    expect(res.status).not.toBe(401);
  });

  it('returns 401 when token is expired', async () => {
    const token = jwt.sign(
      { userId: 1, email: 'test@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: -10 }
    );

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired access token');
  });

  it('returns 401 when Bearer token is empty', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
  });
});
