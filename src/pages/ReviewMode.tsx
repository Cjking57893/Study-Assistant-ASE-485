import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import './ReviewMode.css';

interface Flashcard {
  id: number;
  question_type: string;
  question: string;
  answer: string;
  options: string[] | null;
}

interface DeckInfo {
  id: number;
  title: string;
  flashcards: Flashcard[];
}

type ReviewResult = 'correct' | 'incorrect';

function ReviewMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDeck = async () => {
      try {
        const res = await api(`/api/decks/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDeck(data);
          if (data.flashcards.length === 0) {
            navigate(`/decks/${id}`);
          }
        } else {
          navigate('/dashboard');
        }
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadDeck();
  }, [id, navigate]);

  const currentCard = deck?.flashcards[currentIndex];
  const totalCards = deck?.flashcards.length ?? 0;
  const correctCount = results.filter((r) => r === 'correct').length;

  const handleFlip = () => {
    if (!submitted) {
      setFlipped(true);
      setSubmitted(true);
    }
  };

  const handleSubmitAnswer = () => {
    if (!currentCard) return;

    let isCorrect = false;

    if (currentCard.question_type === 'multiple_choice') {
      isCorrect = selectedOption?.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
    } else if (currentCard.question_type === 'true_false') {
      isCorrect = selectedOption?.toLowerCase() === currentCard.answer.toLowerCase();
    } else {
      isCorrect = userAnswer.toLowerCase().trim() === currentCard.answer.toLowerCase().trim();
    }

    setSubmitted(true);
    setFlipped(true);
    setResults([...results, isCorrect ? 'correct' : 'incorrect']);
  };

  const handleSelfScore = (result: ReviewResult) => {
    setResults([...results, result]);
    advance();
  };

  const advance = () => {
    if (currentIndex + 1 >= totalCards) {
      setFinished(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
      setSelectedOption(null);
      setUserAnswer('');
      setSubmitted(false);
    }
  };

  const handleNext = () => {
    advance();
  };

  const saveSession = async () => {
    if (!deck || saving) return;
    setSaving(true);
    try {
      await api('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          deck_id: deck.id,
          total_cards: totalCards,
          correct: correctCount,
        }),
      });
    } catch {
      // Session save failed silently
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (finished && deck) {
      saveSession();
    }
  }, [finished]);

  const handleRetryMissed = () => {
    if (!deck) return;
    const missedCards = deck.flashcards.filter((_, i) => results[i] === 'incorrect');
    if (missedCards.length === 0) return;

    setDeck({ ...deck, flashcards: missedCards });
    setCurrentIndex(0);
    setResults([]);
    setFlipped(false);
    setSelectedOption(null);
    setUserAnswer('');
    setSubmitted(false);
    setFinished(false);
  };

  if (loading) {
    return <div className="review-page"><p className="loading-text">Loading...</p></div>;
  }

  if (!deck || !currentCard) {
    return <div className="review-page"><p className="loading-text">No flashcards to review.</p></div>;
  }

  if (finished) {
    const percentage = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    const missedCount = results.filter((r) => r === 'incorrect').length;

    return (
      <div className="review-page">
        <div className="review-summary">
          <h1>Review Complete</h1>
          <p className="review-deck-title">{deck.title}</p>

          <div className="review-score-circle" data-score={percentage >= 70 ? 'good' : percentage >= 40 ? 'ok' : 'low'}>
            <span className="review-score-number">{percentage}%</span>
          </div>

          <div className="review-score-details">
            <span className="score-correct">{correctCount} correct</span>
            <span className="score-divider">/</span>
            <span className="score-total">{totalCards} total</span>
          </div>

          <div className="review-summary-actions">
            {missedCount > 0 && (
              <button className="review-retry-btn" onClick={handleRetryMissed}>
                Retry Missed ({missedCount})
              </button>
            )}
            <button className="review-back-btn" onClick={() => navigate(`/decks/${id}`)}>
              Back to Deck
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;
  const isInteractive = currentCard.question_type === 'multiple_choice' || currentCard.question_type === 'true_false' || currentCard.question_type === 'fill_blank';

  return (
    <div className="review-page">
      <div className="review-header">
        <button className="review-exit-btn" onClick={() => navigate(`/decks/${id}`)}>
          Exit Review
        </button>
        <span className="review-progress-text">
          {currentIndex + 1} of {totalCards}
        </span>
      </div>

      <div className="review-progress-bar">
        <div className="review-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="review-card-container">
        <div className={`review-card ${flipped ? 'flipped' : ''}`} onClick={!isInteractive && !submitted ? handleFlip : undefined}>
          <div className="review-card-inner">
            <div className="review-card-front">
              <span className="review-card-label">Question</span>
              <p className="review-card-text">{currentCard.question}</p>

              {currentCard.question_type === 'multiple_choice' && currentCard.options && (
                <div className="review-options">
                  {currentCard.options.map((option) => (
                    <button
                      key={option}
                      className={`review-option ${selectedOption === option ? 'selected' : ''} ${submitted ? (option.toLowerCase().trim() === currentCard.answer.toLowerCase().trim() ? 'correct' : selectedOption === option ? 'incorrect' : '') : ''}`}
                      onClick={() => !submitted && setSelectedOption(option)}
                      disabled={submitted}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {currentCard.question_type === 'true_false' && (
                <div className="review-options">
                  {['True', 'False'].map((option) => (
                    <button
                      key={option}
                      className={`review-option ${selectedOption === option ? 'selected' : ''} ${submitted ? (option.toLowerCase() === currentCard.answer.toLowerCase() ? 'correct' : selectedOption === option ? 'incorrect' : '') : ''}`}
                      onClick={() => !submitted && setSelectedOption(option)}
                      disabled={submitted}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {currentCard.question_type === 'fill_blank' && (
                <div className="review-fill-blank">
                  <input
                    type="text"
                    className={`review-fill-input ${submitted ? (userAnswer.toLowerCase().trim() === currentCard.answer.toLowerCase().trim() ? 'correct' : 'incorrect') : ''}`}
                    placeholder="Type your answer..."
                    value={userAnswer}
                    onChange={(e) => !submitted && setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !submitted && userAnswer.trim() && handleSubmitAnswer()}
                    disabled={submitted}
                  />
                </div>
              )}

              {!submitted && isInteractive && (selectedOption || userAnswer.trim()) && (
                <button className="review-submit-btn" onClick={handleSubmitAnswer}>
                  Submit Answer
                </button>
              )}

              {!isInteractive && !submitted && (
                <p className="review-flip-hint">Click to reveal answer</p>
              )}
            </div>

            {flipped && (
              <div className="review-card-answer">
                <span className="review-card-label">Answer</span>
                <p className="review-card-text">{currentCard.answer}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {submitted && (
        <div className="review-actions">
          {isInteractive ? (
            <button className="review-next-btn" onClick={handleNext}>
              {currentIndex + 1 >= totalCards ? 'Finish' : 'Next'}
            </button>
          ) : (
            <>
              <button className="review-incorrect-btn" onClick={() => handleSelfScore('incorrect')}>
                Missed It
              </button>
              <button className="review-correct-btn" onClick={() => handleSelfScore('correct')}>
                Got It
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewMode;
