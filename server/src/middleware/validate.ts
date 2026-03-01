import { Request, Response, NextFunction } from 'express';

const HAS_NUMBER = /[0-9]/;
const HAS_SYMBOL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(req: Request, res: Response, next: NextFunction): void {
  const { name, email, password } = req.body;

  const errors: string[] = [];

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    errors.push('Name is required');
  }
  if (name && name.trim().length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else if (!VALID_EMAIL.test(email)) {
    errors.push('Invalid email format');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!HAS_NUMBER.test(password)) {
      errors.push('Password must include at least one number');
    }
    if (!HAS_SYMBOL.test(password)) {
      errors.push('Password must include at least one symbol');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(', ') });
    return;
  }

  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  next();
}
