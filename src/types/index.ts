export interface Flashcard {
  id: number;
  question_type: string;
  question: string;
  answer: string;
  options: string[] | null;
}

export interface Quiz {
  id: number;
  title: string;
  created_at: string;
}

export interface Note {
  id: number;
  original_filename: string | null;
  created_at: string;
}
