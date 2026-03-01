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

vi.mock('../services/ai.js', () => ({
  generateFlashcards: vi.fn(),
  generateQuizQuestions: vi.fn(),
}));

import app from '../app.js';
import pool from '../config/db.js';
import { generateFlashcards, generateQuizQuestions } from '../services/ai.js';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;
const mockGenerateFlashcards = generateFlashcards as ReturnType<typeof vi.fn>;
const mockGenerateQuizQuestions = generateQuizQuestions as ReturnType<typeof vi.fn>;

function authHeader() {
  const token = jwt.sign({ userId: 1, email: 'test@test.com' }, process.env.JWT_SECRET!, { expiresIn: 900 });
  return `Bearer ${token}`;
}

beforeEach(() => {
  mockQuery.mockReset();
  mockGenerateFlashcards.mockReset();
  mockGenerateQuizQuestions.mockReset();
});

describe('POST /api/decks/:deckId/generate/flashcards', () => {
  it('generates and saves flashcards', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({ rows: [{ content: 'Study notes about biology' }] }) // note check
      .mockResolvedValueOnce({ rows: [{ id: 1, question_type: 'fill_blank', question: 'Q1', answer: 'A1', options: null, created_at: new Date() }] });

    mockGenerateFlashcards.mockResolvedValueOnce([
      { question_type: 'fill_blank', question: 'Q1', answer: 'A1' },
    ]);

    const res = await request(app)
      .post('/api/decks/1/generate/flashcards')
      .set('Authorization', authHeader())
      .send({ noteId: 1, count: 1 });

    expect(res.status).toBe(201);
    expect(res.body.flashcards).toHaveLength(1);
    expect(mockGenerateFlashcards).toHaveBeenCalledWith('Study notes about biology', 1);
  });

  it('returns 400 when noteId is missing', async () => {
    const res = await request(app)
      .post('/api/decks/1/generate/flashcards')
      .set('Authorization', authHeader())
      .send({ count: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('noteId is required');
  });

  it('returns 400 for invalid count', async () => {
    const res = await request(app)
      .post('/api/decks/1/generate/flashcards')
      .set('Authorization', authHeader())
      .send({ noteId: 1, count: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('count must be between');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/decks/999/generate/flashcards')
      .set('Authorization', authHeader())
      .send({ noteId: 1, count: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Deck not found');
  });

  it('returns 404 for non-existent note', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/decks/1/generate/flashcards')
      .set('Authorization', authHeader())
      .send({ noteId: 999, count: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Note not found');
  });

  it('returns 422 when AI cannot generate content', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ content: 'Short' }] });

    mockGenerateFlashcards.mockRejectedValueOnce(
      new Error('AI could not generate flashcards from the provided content. Try with more detailed notes.')
    );

    const res = await request(app)
      .post('/api/decks/1/generate/flashcards')
      .set('Authorization', authHeader())
      .send({ noteId: 1, count: 5 });

    expect(res.status).toBe(422);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/decks/1/generate/flashcards')
      .send({ noteId: 1, count: 5 });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/decks/:deckId/generate/quiz', () => {
  it('generates and saves a quiz', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // deck check
      .mockResolvedValueOnce({ rows: [{ content: 'Study notes' }] }) // note check
      .mockResolvedValueOnce({ rows: [{ id: 1, title: 'My Quiz', created_at: new Date() }] }) // quiz insert
      .mockResolvedValueOnce({ rows: [{ id: 1, question_type: 'short_answer', question: 'Q1', answer: 'A1', options: null, created_at: new Date() }] });

    mockGenerateQuizQuestions.mockResolvedValueOnce([
      { question_type: 'short_answer', question: 'Q1', answer: 'A1' },
    ]);

    const res = await request(app)
      .post('/api/decks/1/generate/quiz')
      .set('Authorization', authHeader())
      .send({ noteId: 1, title: 'My Quiz', questionCount: 1 });

    expect(res.status).toBe(201);
    expect(res.body.quiz.title).toBe('My Quiz');
    expect(res.body.questions).toHaveLength(1);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/decks/1/generate/quiz')
      .set('Authorization', authHeader())
      .send({ noteId: 1, questionCount: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('title is required');
  });

  it('returns 400 when noteId is missing', async () => {
    const res = await request(app)
      .post('/api/decks/1/generate/quiz')
      .set('Authorization', authHeader())
      .send({ title: 'Quiz', questionCount: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('noteId is required');
  });

  it('returns 404 for non-existent deck', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/decks/999/generate/quiz')
      .set('Authorization', authHeader())
      .send({ noteId: 1, title: 'Quiz', questionCount: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/decks/1/generate/quiz')
      .send({ noteId: 1, title: 'Quiz', questionCount: 5 });

    expect(res.status).toBe(401);
  });
});
