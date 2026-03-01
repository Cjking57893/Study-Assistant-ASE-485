const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/distilgpt2';
const MAX_GENERATED_TOKENS = 500;

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

async function callHuggingFace(prompt: string): Promise<string> {
  const res = await fetch(HUGGINGFACE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: MAX_GENERATED_TOKENS,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HuggingFace API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data[0]?.generated_text ?? '';
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
        question: qaParts[0],
        answer: qaParts[1],
      });
    }
  }

  return cards;
}

function parseQuizQuestions(raw: string, count: number): GeneratedQuizQuestion[] {
  const questions: GeneratedQuizQuestion[] = [];
  const lines = raw.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    if (questions.length >= count) break;

    const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const options = parts.slice(2);
      questions.push({
        question_type: options.length > 0 ? 'multiple_choice' : 'short_answer',
        question: parts[0],
        answer: parts[1],
        options: options.length > 0 ? options : undefined,
      });
    } else if (parts.length === 2) {
      questions.push({
        question_type: 'short_answer',
        question: parts[0],
        answer: parts[1],
      });
    }
  }

  return questions;
}

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '...';
}

const MAX_CONTENT_CHARS = 1000;

export async function generateFlashcards(
  noteContent: string,
  count: number
): Promise<GeneratedFlashcard[]> {
  const truncated = truncateContent(noteContent, MAX_CONTENT_CHARS);
  const prompt = `Based on the following study notes, generate ${count} flashcard questions and answers. Format each as: Question | Answer (one per line).

Notes:
${truncated}

Flashcards:
`;

  const raw = await callHuggingFace(prompt);
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
  const prompt = `Based on the following study notes, generate ${count} quiz questions with answers. For multiple choice, format as: Question | Answer | Option A | Option B | Option C | Option D (one per line). For short answer, format as: Question | Answer (one per line).

Notes:
${truncated}

Quiz Questions:
`;

  const raw = await callHuggingFace(prompt);
  const parsed = parseQuizQuestions(raw, count);

  if (parsed.length === 0) {
    throw new Error('AI could not generate quiz questions from the provided content. Try with more detailed notes.');
  }

  return parsed;
}
