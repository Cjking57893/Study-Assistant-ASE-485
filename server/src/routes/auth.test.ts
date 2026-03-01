import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('express-rate-limit', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

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
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;
const mockHash = bcrypt.hash as ReturnType<typeof vi.fn>;
const mockCompare = bcrypt.compare as ReturnType<typeof vi.fn>;
const mockSign = jwt.sign as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQuery.mockReset();
  mockHash.mockReset();
  mockCompare.mockReset();
});

describe('POST /api/auth/register', () => {
  const VALID_BODY = {
    name: 'Alice',
    email: 'Alice@Example.com',
    password: 'Passw0rd!',
  };

  it('registers successfully and returns 201', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    const res = await request(app).post('/api/auth/register').send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Account created successfully');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('name');
    expect(res.body.user).toHaveProperty('email');
  });

  it('normalizes email to lowercase', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    await request(app).post('/api/auth/register').send(VALID_BODY);

    const selectCall = mockQuery.mock.calls[0];
    expect(selectCall[1][0]).toBe('alice@example.com');
  });

  it('returns 409 for duplicate email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).post('/api/auth/register').send(VALID_BODY);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('returns 400 for validation failure', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'bad', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'a@b.com', password: 'nouppercase' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).post('/api/auth/register').send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });

  it('trims whitespace from name before saving', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    await request(app)
      .post('/api/auth/register')
      .send({ name: '  Alice  ', email: 'alice@example.com', password: 'Passw0rd!' });

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][0]).toBe('Alice');
  });

  it('stores lowercased email in database', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'Alice@Example.COM', password: 'Passw0rd!' });

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1][1]).toBe('alice@example.com');
  });

  it('hashes password with bcrypt', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    await request(app).post('/api/auth/register').send(VALID_BODY);

    expect(mockHash).toHaveBeenCalledWith('Passw0rd!', 10);
  });

  it('calls jwt.sign with correct payload', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 42, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    await request(app).post('/api/auth/register').send(VALID_BODY);

    expect(mockSign).toHaveBeenCalledWith(
      { userId: 42, email: 'alice@example.com' },
      'test-jwt-secret',
      { expiresIn: 900 }
    );
  });

  it('saves refresh token to database', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    await request(app).post('/api/auth/register').send(VALID_BODY);

    const saveCall = mockQuery.mock.calls[2];
    expect(saveCall[0]).toContain('INSERT INTO refresh_tokens');
    expect(saveCall[1][0]).toBe(1);
    expect(saveCall[1][1]).toBe('mock-refresh-token');
  });

  it('does not include password_hash in response', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: new Date() }],
      })
      .mockResolvedValueOnce({});
    mockHash.mockResolvedValue('hashed-password');

    const res = await request(app).post('/api/auth/register').send(VALID_BODY);

    expect(res.body.user).not.toHaveProperty('password_hash');
  });
});

describe('POST /api/auth/login', () => {
  const VALID_BODY = { email: 'Alice@Example.com', password: 'Passw0rd!' };

  it('logs in successfully', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', password_hash: 'hashed' }],
      })
      .mockResolvedValueOnce({});
    mockCompare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toHaveProperty('id');
  });

  it('returns 401 when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 for wrong password', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', password_hash: 'hashed' }],
    });
    mockCompare.mockResolvedValue(false);

    const res = await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('normalizes email to lowercase', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', password_hash: 'hashed' }],
      })
      .mockResolvedValueOnce({});
    mockCompare.mockResolvedValue(true);

    await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(mockQuery.mock.calls[0][1][0]).toBe('alice@example.com');
  });

  it('does not include password_hash in response', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', password_hash: 'hashed' }],
      })
      .mockResolvedValueOnce({});
    mockCompare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('passes correct arguments to bcrypt.compare', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', password_hash: 'stored-hash' }],
      })
      .mockResolvedValueOnce({});
    mockCompare.mockResolvedValue(true);

    await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(mockCompare).toHaveBeenCalledWith('Passw0rd!', 'stored-hash');
  });

  it('saves a new refresh token on login', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Alice', email: 'alice@example.com', password_hash: 'hashed' }],
      })
      .mockResolvedValueOnce({});
    mockCompare.mockResolvedValue(true);

    await request(app).post('/api/auth/login').send(VALID_BODY);

    const saveCall = mockQuery.mock.calls[1];
    expect(saveCall[0]).toContain('INSERT INTO refresh_tokens');
    expect(saveCall[1][0]).toBe(5);
    expect(saveCall[1][1]).toBe('mock-refresh-token');
  });

  it('returns 400 for validation failure', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).post('/api/auth/login').send(VALID_BODY);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates tokens successfully', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 10, user_id: 1, expires_at: futureDate, email: 'a@b.com' }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('deletes the old token and saves a new one', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 10, user_id: 1, expires_at: futureDate, email: 'a@b.com' }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'old-token' });

    const deleteCall = mockQuery.mock.calls[1];
    expect(deleteCall[0]).toContain('DELETE FROM refresh_tokens WHERE id');
    expect(deleteCall[1][0]).toBe(10);

    const insertCall = mockQuery.mock.calls[2];
    expect(insertCall[0]).toContain('INSERT INTO refresh_tokens');
    expect(insertCall[1][0]).toBe(1);
    expect(insertCall[1][1]).toBe('mock-refresh-token');
  });

  it('deletes expired token from database', async () => {
    const pastDate = new Date(Date.now() - 86400000);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 77, user_id: 1, expires_at: pastDate, email: 'a@b.com' }],
      })
      .mockResolvedValueOnce({});

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired-token' });

    const deleteCall = mockQuery.mock.calls[1];
    expect(deleteCall[0]).toContain('DELETE FROM refresh_tokens WHERE id');
    expect(deleteCall[1][0]).toBe(77);
  });

  it('returns 400 for missing token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Refresh token is required');
  });

  it('returns 400 for non-string token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Refresh token is required');
  });

  it('returns 401 for token not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'nonexistent' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token');
  });

  it('returns 401 for expired token', async () => {
    const pastDate = new Date(Date.now() - 86400000);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 10, user_id: 1, expires_at: pastDate, email: 'a@b.com' }],
      })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Refresh token has expired');
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('POST /api/auth/logout', () => {
  it('logs out successfully with token', async () => {
    mockQuery.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(mockQuery).toHaveBeenCalledWith(
      'DELETE FROM refresh_tokens WHERE token = $1',
      ['some-token']
    );
  });

  it('logs out successfully without token', async () => {
    const res = await request(app).post('/api/auth/logout').send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('logs out successfully with null token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: null });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Unknown routes', () => {
  it('returns 401 for unmatched API routes without auth', async () => {
    const res = await request(app).get('/api/auth/nonexistent');

    expect(res.status).toBe(401);
  });
});
