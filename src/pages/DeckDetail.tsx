import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import AppHeader from '../components/AppHeader';
import type { Flashcard, Quiz, Note } from '../types';
import './DeckDetail.css';

interface QuizQuestion {
  id: number;
  question_type: string;
  question: string;
  answer: string;
  options: string[] | null;
}

interface DeckData {
  id: number;
  title: string;
  description: string | null;
  category_name: string | null;
  flashcards: Flashcard[];
  quizzes: Quiz[];
  notes: Note[];
}

const VALID_FLASHCARD_TYPES = ['multiple_choice', 'true_false', 'fill_blank'] as const;

function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flashcards' | 'quizzes' | 'notes'>('flashcards');
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ question_type: 'fill_blank', question: '', answer: '', options: '' });
  const [loadError, setLoadError] = useState('');
  const [cardError, setCardError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadPreview, setUploadPreview] = useState<{ content: string; filename: string; noteId: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateNoteId, setGenerateNoteId] = useState<number | null>(null);
  const [generateCount, setGenerateCount] = useState(5);
  const [generateType, setGenerateType] = useState<'flashcards' | 'quiz'>('flashcards');
  const [quizTitle, setQuizTitle] = useState('');
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const loadDeck = async () => {
    try {
      setLoadError('');
      const res = await api(`/api/decks/${id}`);
      if (res.ok) {
        setDeck(await res.json());
      } else if (res.status === 404) {
        navigate('/dashboard');
      } else {
        setLoadError('Failed to load deck');
      }
    } catch {
      setLoadError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeck();
  }, [id]);

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError('');

    const body: Record<string, unknown> = {
      question_type: newCard.question_type,
      question: newCard.question,
      answer: newCard.answer,
    };

    if (newCard.question_type === 'multiple_choice' && newCard.options) {
      body.options = newCard.options.split(',').map((o) => o.trim()).filter(Boolean);
    }

    try {
      const res = await api(`/api/decks/${id}/flashcards`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewCard({ question_type: 'fill_blank', question: '', answer: '', options: '' });
        setShowAddCard(false);
        loadDeck();
      } else {
        const data = await res.json();
        setCardError(data.error);
      }
    } catch {
      setCardError('Network error');
    }
  };

  const handleDeleteFlashcard = async (cardId: number) => {
    try {
      const res = await api(`/api/flashcards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        loadDeck();
      } else {
        setCardError('Failed to delete flashcard');
      }
    } catch {
      setCardError('Network error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    setUploadPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api(`/api/decks/${id}/notes/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error);
      } else {
        setUploadPreview({ content: data.content, filename: data.original_filename, noteId: data.id });
        loadDeck();
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      const res = await api(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        if (uploadPreview?.noteId === noteId) setUploadPreview(null);
        loadDeck();
      } else {
        setUploadError('Failed to delete note');
      }
    } catch {
      setUploadError('Network error');
    }
  };

  const [quizError, setQuizError] = useState('');

  const handleDeleteQuiz = async (quizId: number) => {
    try {
      setQuizError('');
      const res = await api(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        loadDeck();
      } else {
        setQuizError('Failed to delete quiz');
      }
    } catch {
      setQuizError('Network error');
    }
  };

  const handleToggleQuiz = async (quizId: number) => {
    if (expandedQuizId === quizId) {
      setExpandedQuizId(null);
      setQuizQuestions([]);
      return;
    }
    setLoadingQuiz(true);
    setExpandedQuizId(quizId);
    setQuizQuestions([]);
    try {
      const res = await api(`/api/quizzes/${quizId}`);
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions);
      } else {
        setQuizError('Failed to load quiz questions');
        setExpandedQuizId(null);
      }
    } catch {
      setQuizError('Network error');
      setExpandedQuizId(null);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateNoteId || generating) return;
    setGenerating(true);
    setGenerateError('');

    try {
      const endpoint = generateType === 'flashcards'
        ? `/api/decks/${id}/generate/flashcards`
        : `/api/decks/${id}/generate/quiz`;

      const body = generateType === 'flashcards'
        ? { noteId: generateNoteId, count: generateCount }
        : { noteId: generateNoteId, title: quizTitle || 'Generated Quiz', questionCount: generateCount };

      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const itemCount = generateType === 'flashcards' ? data.flashcards.length : data.questions.length;
        const message = `Generated ${itemCount} ${generateType === 'flashcards' ? 'flashcard' : 'quiz question'}${itemCount !== 1 ? 's' : ''}`;
        alert(message);
        setGenerateNoteId(null);
        setQuizTitle('');
        loadDeck();
      } else {
        const data = await res.json();
        setGenerateError(data.error);
      }
    } catch {
      setGenerateError('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="dashboard-page"><p className="loading-text">Loading...</p></div>;
  }

  if (!deck) {
    return (
      <div className="dashboard-page">
        <AppHeader />
        <main className="dashboard-content">
          {loadError ? <div className="feedback-error">{loadError}</div> : <p className="loading-text">Deck not found.</p>}
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <AppHeader />

      <main className="dashboard-content">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          &larr; Back to Decks
        </button>

        <div className="deck-detail-header">
          <div>
            <h1>{deck.title}</h1>
            {deck.category_name && <span className="deck-category-badge">{deck.category_name}</span>}
            {deck.description && <p className="deck-detail-description">{deck.description}</p>}
          </div>
        </div>

        <div className="deck-tabs">
          <button
            className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
            onClick={() => setActiveTab('flashcards')}
          >
            Flashcards ({deck.flashcards.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            Quizzes ({deck.quizzes.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes ({deck.notes.length})
          </button>
        </div>

        {activeTab === 'flashcards' && (
          <div className="tab-content">
            <div className="tab-content-actions">
              <button className="add-item-btn" onClick={() => setShowAddCard(!showAddCard)}>
                {showAddCard ? 'Cancel' : '+ Add Flashcard'}
              </button>
              {deck.flashcards.length > 0 && (
                <button className="review-btn" onClick={() => navigate(`/decks/${id}/review`)}>
                  Start Review
                </button>
              )}
            </div>

            {showAddCard && (
              <form className="add-card-form" onSubmit={handleAddFlashcard}>
                {cardError && <div className="feedback-error">{cardError}</div>}
                <div className="form-group">
                  <label htmlFor="card-type">Type</label>
                  <select
                    id="card-type"
                    value={newCard.question_type}
                    onChange={(e) => setNewCard({ ...newCard, question_type: e.target.value })}
                  >
                    {VALID_FLASHCARD_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="card-question">Question</label>
                  <textarea
                    id="card-question"
                    value={newCard.question}
                    onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                    required
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="card-answer">Answer</label>
                  <textarea
                    id="card-answer"
                    value={newCard.answer}
                    onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                    required
                    rows={2}
                  />
                </div>
                {newCard.question_type === 'multiple_choice' && (
                  <div className="form-group">
                    <label htmlFor="card-options">Options (comma-separated)</label>
                    <input
                      id="card-options"
                      type="text"
                      value={newCard.options}
                      onChange={(e) => setNewCard({ ...newCard, options: e.target.value })}
                      placeholder="Option A, Option B, Option C, Option D"
                    />
                  </div>
                )}
                <button type="submit" className="btn-primary">Add Flashcard</button>
              </form>
            )}

            {deck.flashcards.length === 0 ? (
              <p className="empty-tab">No flashcards yet. Add one above or generate them from notes.</p>
            ) : (
              <div className="flashcard-list">
                {deck.flashcards.map((card) => (
                  <div key={card.id} className="flashcard-item">
                    <div className="flashcard-item-content">
                      <span className="flashcard-type-badge">{card.question_type.replace('_', ' ')}</span>
                      <p className="flashcard-question">{card.question}</p>
                      <p className="flashcard-answer">{card.answer}</p>
                    </div>
                    <button
                      className="deck-action-btn deck-delete-btn"
                      onClick={() => handleDeleteFlashcard(card.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="tab-content">
            {quizError && <div className="feedback-error">{quizError}</div>}
            {deck.quizzes.length === 0 ? (
              <p className="empty-tab">No quizzes yet. Generate them from your notes.</p>
            ) : (
              <div className="quiz-list">
                {deck.quizzes.map((quiz) => (
                  <div key={quiz.id} className={`quiz-item-wrapper ${expandedQuizId === quiz.id ? 'expanded' : ''}`}>
                    <div className="quiz-item" onClick={() => handleToggleQuiz(quiz.id)}>
                      <span className="quiz-item-title">
                        <span className={`quiz-expand-icon ${expandedQuizId === quiz.id ? 'open' : ''}`}>&#9656;</span>
                        {quiz.title}
                      </span>
                      <div className="quiz-item-actions">
                        <button
                          className="quiz-take-btn"
                          onClick={(e) => { e.stopPropagation(); navigate(`/quizzes/${quiz.id}/take`); }}
                        >
                          Take Quiz
                        </button>
                        <span className="quiz-date">{new Date(quiz.created_at).toLocaleDateString()}</span>
                        <button
                          className="deck-action-btn deck-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {expandedQuizId === quiz.id && (
                      <div className="quiz-questions-panel">
                        {loadingQuiz ? (
                          <p className="quiz-questions-loading">Loading questions...</p>
                        ) : quizQuestions.length === 0 ? (
                          <p className="quiz-questions-loading">No questions found.</p>
                        ) : (
                          <div className="quiz-questions-list">
                            {quizQuestions.map((q, i) => (
                              <div key={q.id} className="quiz-question-item">
                                <div className="quiz-question-header">
                                  <span className="quiz-question-number">Q{i + 1}</span>
                                  <span className="flashcard-type-badge">{q.question_type.replace('_', ' ')}</span>
                                </div>
                                <p className="quiz-question-text">{q.question}</p>
                                {q.options && (
                                  <ul className="quiz-question-options">
                                    {q.options.map((opt, j) => (
                                      <li key={j} className={opt.toLowerCase().trim() === q.answer.toLowerCase().trim() ? 'correct-option' : ''}>{opt}</li>
                                    ))}
                                  </ul>
                                )}
                                <p className="quiz-question-answer">Answer: {q.answer}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="tab-content">
            <label className="upload-btn">
              {uploading ? 'Uploading...' : 'Upload Notes'}
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                hidden
              />
            </label>
            {uploadError && <div className="feedback-error">{uploadError}</div>}

            {uploadPreview && (
              <div className="upload-preview">
                <div className="upload-preview-header">
                  <span className="upload-preview-filename">{uploadPreview.filename}</span>
                  <button className="upload-preview-close" onClick={() => setUploadPreview(null)}>Dismiss</button>
                </div>
                <pre className="upload-preview-content">{uploadPreview.content}</pre>
              </div>
            )}

            {deck.notes.length === 0 && !uploadPreview ? (
              <p className="empty-tab">No notes yet. Upload .txt, .pdf, or .docx files to extract content.</p>
            ) : (
              <>
                <div className="notes-list">
                  {deck.notes.map((note) => (
                    <div key={note.id} className="note-item">
                      <span>{note.original_filename || 'Untitled note'}</span>
                      <div className="note-item-actions">
                        <button
                          className="generate-from-note-btn"
                          onClick={() => setGenerateNoteId(generateNoteId === note.id ? null : note.id)}
                        >
                          {generateNoteId === note.id ? 'Cancel' : 'Generate'}
                        </button>
                        <span className="note-date">{new Date(note.created_at).toLocaleDateString()}</span>
                        <button
                          className="deck-action-btn deck-delete-btn"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {generateNoteId && (
                  <div className="generate-panel">
                    <h3 className="generate-panel-title">AI Generate</h3>
                    <p className="generate-disclaimer">
                      AI generates questions from up to ~25 pages of your notes.
                      Questions are based only on the content of your notes.
                    </p>
                    {generateError && <div className="feedback-error">{generateError}</div>}
                    <div className="generate-options">
                      <div className="form-group">
                        <label htmlFor="generate-type">Type</label>
                        <select
                          id="generate-type"
                          value={generateType}
                          onChange={(e) => setGenerateType(e.target.value as 'flashcards' | 'quiz')}
                        >
                          <option value="flashcards">Flashcards</option>
                          <option value="quiz">Quiz</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="generate-count">Count</label>
                        <input
                          id="generate-count"
                          type="number"
                          min={1}
                          max={20}
                          value={generateCount}
                          onChange={(e) => setGenerateCount(Number(e.target.value))}
                        />
                      </div>
                      {generateType === 'quiz' && (
                        <div className="form-group">
                          <label htmlFor="quiz-title">Quiz Title</label>
                          <input
                            id="quiz-title"
                            type="text"
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            placeholder="Generated Quiz"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      className="generate-btn"
                      onClick={handleGenerate}
                      disabled={generating}
                    >
                      {generating ? 'Generating...' : `Generate ${generateType === 'flashcards' ? 'Flashcards' : 'Quiz'}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default DeckDetail;
