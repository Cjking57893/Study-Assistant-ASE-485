import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../config/db.js', () => ({
  default: { query: vi.fn() },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-access-token'),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => 'mock-refresh-token',
    })),
  },
}));

import app from '../app.js';
import pool from '../config/db.js';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Rate limiting', () => {
  it('allows 10 requests then blocks the 11th with 429', async () => {
    for (let i = 0; i < 10; i++) {
      mockQuery.mockResolvedValueOnce({ rows: [] });
    }

    const results = [];
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: 'anything' });
      results.push(res.status);
    }

    expect(results.every((s) => s === 401)).toBe(true);

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'anything' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain('Too many attempts');
  });
});
