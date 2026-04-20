const HUGGINGFACE_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const MAX_GENERATED_TOKENS = 2048;

interface GeneratedFlashcard {
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank';
  question: string;
  answer: string;
  options?: string[];
}

interface GeneratedQuizQuestion {
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  answer: string;
  options?: string[];
}

function getApiKey(): string {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) {
    throw new Error('HUGGINGFACE_API_KEY is not set');
  }
  return key;
}

async function callHuggingFace(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(HUGGINGFACE_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: MAX_GENERATED_TOKENS,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HuggingFace API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function parseFlashcards(raw: string, count: number): GeneratedFlashcard[] {
  const cards: GeneratedFlashcard[] = [];
  const lines = raw.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    if (cards.length >= count) break;

    const qaParts = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (qaParts.length >= 2) {
      cards.push({
        question_type: 'fill_blank',
        question: ensureQuestionMark(qaParts[0]),
        answer: qaParts[1],
      });
    }
  }

  return cards;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function ensureAnswerInOptions(answer: string, options: string[]): string[] {
  const answerLower = answer.toLowerCase().trim();
  const hasAnswer = options.some((o) => o.toLowerCase().trim() === answerLower);
  if (hasAnswer) return options;
  return shuffleArray([...options, answer]);
}

function parseQuizQuestions(raw: string, count: number): GeneratedQuizQuestion[] {
  const questions: GeneratedQuizQuestion[] = [];
  const lines = raw.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    if (questions.length >= count) break;

    const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const answer = parts[1];
      const rawOptions = parts.slice(2);
      const options = ensureAnswerInOptions(answer, rawOptions);
      questions.push({
        question_type: 'multiple_choice',
        question: ensureQuestionMark(parts[0]),
        answer,
        options,
      });
    } else if (parts.length === 2) {
      questions.push({
        question_type: 'short_answer',
        question: ensureQuestionMark(parts[0]),
        answer: parts[1],
      });
    }
  }

  return questions;
}

function ensureQuestionMark(question: string): string {
  const trimmed = question.trim();
  if (trimmed.endsWith('?')) return trimmed;
  return trimmed + '?';
}

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '...';
}

const MAX_CONTENT_CHARS = 75000;

const FLASHCARD_SYSTEM_PROMPT = `You are a study assistant that generates flashcards from notes. Use ONLY information explicitly stated in the provided notes. Do not add any outside knowledge, facts, or details that are not directly in the notes. Output ONLY the flashcards in the exact format specified, with no extra text or explanation.`;

const QUIZ_SYSTEM_PROMPT = `You are a study assistant that generates quiz questions from notes. Use ONLY information explicitly stated in the provided notes. Do not add any outside knowledge, facts, or details that are not directly in the notes. Output ONLY the quiz questions in the exact format specified, with no extra text or explanation.`;

export async function generateFlashcards(
  noteContent: string,
  count: number
): Promise<GeneratedFlashcard[]> {
  const truncated = truncateContent(noteContent, MAX_CONTENT_CHARS);
  const userPrompt = `Based on the following study notes, generate exactly ${count} flashcard questions and answers.

Format each flashcard on its own line as: Question | Answer

Do not number them. Do not add any other text.

Notes:
${truncated}`;

  const raw = await callHuggingFace(FLASHCARD_SYSTEM_PROMPT, userPrompt);
  const parsed = parseFlashcards(raw, count);

  if (parsed.length === 0) {
    throw new Error('AI could not generate flashcards from the provided content. Try with more detailed notes.');
  }

  return parsed;
}

export async function generateQuizQuestions(
  noteContent: string,
  count: number
): Promise<GeneratedQuizQuestion[]> {
  const truncated = truncateContent(noteContent, MAX_CONTENT_CHARS);
  const userPrompt = `Based on the following study notes, generate exactly ${count} quiz questions with answers.

For multiple choice questions, format as: Question | Answer | Option A | Option B | Option C | Option D
The Answer MUST be exactly one of the Options.
For short answer questions, format as: Question | Answer

Do not number them. Do not add any other text. Mix question types.

Notes:
${truncated}`;

  const raw = await callHuggingFace(QUIZ_SYSTEM_PROMPT, userPrompt);
  const parsed = parseQuizQuestions(raw, count);

  if (parsed.length === 0) {
    throw new Error('AI could not generate quiz questions from the provided content. Try with more detailed notes.');
  }

  return parsed;
}
