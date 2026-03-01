import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validateRegister, validateLogin } from './validate.js';

function mockReqResNext(body: Record<string, unknown>) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('validateRegister', () => {
  it('calls next() on valid input', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects missing name', () => {
    const { req, res, next } = mockReqResNext({
      email: 'a@b.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects empty string name', () => {
    const { req, res, next } = mockReqResNext({
      name: '   ',
      email: 'a@b.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-string name', () => {
    const { req, res, next } = mockReqResNext({
      name: 123,
      email: 'a@b.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects name over 100 characters', () => {
    const { req, res, next } = mockReqResNext({
      name: 'A'.repeat(101),
      email: 'a@b.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('100 characters') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing email', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid email format', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'not-an-email',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid email') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-string email', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 42,
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects password shorter than 8 characters', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: 'Pa1!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('at least 8 characters') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects password missing a number', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: 'Password!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('one number') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects password missing a symbol', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: 'Passw0rd',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('one symbol') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing password', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-string password', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: 12345678,
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns multiple errors together', () => {
    const { req, res, next } = mockReqResNext({});
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const errorString = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error as string;
    expect(errorString).toContain('Name is required');
    expect(errorString).toContain('Email is required');
    expect(errorString).toContain('Password is required');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns multiple password errors together', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: 'short',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const errorString = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error as string;
    expect(errorString).toContain('at least 8 characters');
    expect(errorString).toContain('one number');
    expect(errorString).toContain('one symbol');
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts name at exactly 100 characters', () => {
    const { req, res, next } = mockReqResNext({
      name: 'A'.repeat(100),
      email: 'a@b.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts password at exactly 8 characters', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: 'Pass1!ab',
    });
    validateRegister(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects email with spaces', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: '  alice@example.com  ',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects email without domain dot', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'user@localhost',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects email missing local part', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: '@example.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts password with only numbers and symbols', () => {
    const { req, res, next } = mockReqResNext({
      name: 'Alice',
      email: 'a@b.com',
      password: '12345678!',
    });
    validateRegister(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects null name', () => {
    const { req, res, next } = mockReqResNext({
      name: null,
      email: 'a@b.com',
      password: 'Passw0rd!',
    });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects empty body', () => {
    const { req, res, next } = mockReqResNext({});
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateLogin', () => {
  it('calls next() on valid input', () => {
    const { req, res, next } = mockReqResNext({
      email: 'a@b.com',
      password: 'anything',
    });
    validateLogin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects missing email', () => {
    const { req, res, next } = mockReqResNext({
      password: 'anything',
    });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Email is required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing password', () => {
    const { req, res, next } = mockReqResNext({
      email: 'a@b.com',
    });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Password is required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-string email', () => {
    const { req, res, next } = mockReqResNext({
      email: 123,
      password: 'anything',
    });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-string password', () => {
    const { req, res, next } = mockReqResNext({
      email: 'a@b.com',
      password: 123,
    });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects empty body', () => {
    const { req, res, next } = mockReqResNext({});
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects null email', () => {
    const { req, res, next } = mockReqResNext({
      email: null,
      password: 'anything',
    });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects null password', () => {
    const { req, res, next } = mockReqResNext({
      email: 'a@b.com',
      password: null,
    });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
