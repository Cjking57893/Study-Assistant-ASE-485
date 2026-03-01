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

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('mammoth', () => ({
  default: { extractRawText: vi.fn() },
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

describe('POST /api/decks/:deckId/notes/upload', () => {
  it('uploads a text file', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({
        rows: [{ id: 1, original_filename: 'test.txt', content: 'Hello world', created_at: new Date() }],
      });

    const res = await request(app)
      .post('/api/decks/1/notes/upload')
      .set('Authorization', authHeader())
      .attach('file', Buffer.from('Hello world'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(201);
    expect(res.body.original_filename).toBe('test.txt');
    expect(res.body.content).toBe('Hello world');
  });

  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/decks/1/notes/upload')
      .set('Authorization', authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/decks/999/notes/upload')
      .set('Authorization', authHeader())
      .attach('file', Buffer.from('content'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/decks/1/notes/upload')
      .attach('file', Buffer.from('content'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/decks/:deckId/notes', () => {
  it('returns notes for a deck', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({
        rows: [{ id: 1, original_filename: 'test.txt', content: 'Hello', created_at: new Date() }],
      });

    const res = await request(app)
      .get('/api/decks/1/notes')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/decks/999/notes')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});

describe('GET /api/notes/:id', () => {
  it('returns a note', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, original_filename: 'test.txt', content: 'Hello', created_at: new Date() }],
    });

    const res = await request(app)
      .get('/api/notes/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Hello');
  });

  it('returns 404 for non-existent note', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/notes/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/notes/:id', () => {
  it('deletes a note', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/notes/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Note deleted');
  });

  it('returns 404 for non-existent note', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/notes/999')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});
