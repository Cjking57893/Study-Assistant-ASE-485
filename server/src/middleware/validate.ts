import { Request, Response, NextFunction } from 'express';

const HAS_NUMBER = /[0-9]/;
const HAS_SYMBOL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(req: Request, res: Response, next: NextFunction): void {
  const { name, email, password } = req.body;

  const errors: string[] = [];

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    errors.push('Name is required');
  }
  if (typeof name === 'string' && name.trim().length > 100) {
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

const MAX_CATEGORY_NAME_LENGTH = 100;

export function validateCategory(req: Request, res: Response, next: NextFunction): void {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  if (name.trim().length > MAX_CATEGORY_NAME_LENGTH) {
    res.status(400).json({ error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or less` });
    return;
  }

  next();
}

const MAX_DECK_TITLE_LENGTH = 200;

export function validateDeck(req: Request, res: Response, next: NextFunction): void {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 1) {
    res.status(400).json({ error: 'Deck title is required' });
    return;
  }
  if (title.trim().length > MAX_DECK_TITLE_LENGTH) {
    res.status(400).json({ error: `Deck title must be ${MAX_DECK_TITLE_LENGTH} characters or less` });
    return;
  }

  next();
}

const VALID_FLASHCARD_TYPES = ['multiple_choice', 'true_false', 'fill_blank'] as const;

export function validateFlashcard(req: Request, res: Response, next: NextFunction): void {
  const { question_type, question, answer } = req.body;

  if (!question_type || !VALID_FLASHCARD_TYPES.includes(question_type)) {
    res.status(400).json({ error: `question_type must be one of: ${VALID_FLASHCARD_TYPES.join(', ')}` });
    return;
  }
  if (!question || typeof question !== 'string' || question.trim().length < 1) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }
  if (!answer || typeof answer !== 'string' || answer.trim().length < 1) {
    res.status(400).json({ error: 'Answer is required' });
    return;
  }

  next();
}

const VALID_QUIZ_QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer'] as const;

export function validateQuizQuestion(req: Request, res: Response, next: NextFunction): void {
  const { question_type, question, answer } = req.body;

  if (!question_type || !VALID_QUIZ_QUESTION_TYPES.includes(question_type)) {
    res.status(400).json({ error: `question_type must be one of: ${VALID_QUIZ_QUESTION_TYPES.join(', ')}` });
    return;
  }
  if (!question || typeof question !== 'string' || question.trim().length < 1) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }
  if (!answer || typeof answer !== 'string' || answer.trim().length < 1) {
    res.status(400).json({ error: 'Answer is required' });
    return;
  }

  next();
}
