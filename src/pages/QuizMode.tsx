import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import './QuizMode.css';

interface QuizQuestion {
  id: number;
  question_type: string;
  question: string;
  answer: string;
  options: string[] | null;
}

interface QuizData {
  id: number;
  title: string;
  deck_id: number;
  questions: QuizQuestion[];
}

type QuizResult = 'correct' | 'incorrect';

function QuizMode() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showWarning, setShowWarning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<number, QuizResult>>({});

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const res = await api(`/api/quizzes/${quizId}`);
        if (res.ok) {
          const data = await res.json();
          setQuiz(data);
          if (data.questions.length === 0) {
            navigate(-1);
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
    loadQuiz();
  }, [quizId, navigate]);

  if (loading) {
    return <div className="quiz-page"><p className="loading-text">Loading...</p></div>;
  }

  if (!quiz || quiz.questions.length === 0) {
    return <div className="quiz-page"><p className="loading-text">No questions in this quiz.</p></div>;
  }

  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;

  const unansweredIndices = quiz.questions
    .map((q, i) => (answers[q.id] === undefined ? i : -1))
    .filter((i) => i !== -1);

  const handleSelectOption = (questionId: number, option: string) => {
    if (submitted) return;
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleTextAnswer = (questionId: number, value: string) => {
    if (submitted) return;
    if (value === '') {
      const next = { ...answers };
      delete next[questionId];
      setAnswers(next);
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const toggleFlag = (questionId: number) => {
    if (submitted) return;
    const next = new Set(flagged);
    if (next.has(questionId)) {
      next.delete(questionId);
    } else {
      next.add(questionId);
    }
    setFlagged(next);
  };

  const scrollToQuestion = (index: number) => {
    const q = quiz.questions[index];
    const el = questionRefs.current[q.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmitAttempt = () => {
    if (unansweredCount > 0) {
      setShowWarning(true);
      return;
    }
    gradeQuiz();
  };

  const gradeQuiz = () => {
    const graded: Record<number, QuizResult> = {};
    for (const q of quiz.questions) {
      const userAnswer = answers[q.id];
      if (userAnswer === undefined) {
        graded[q.id] = 'incorrect';
        continue;
      }
      const isCorrect = userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
      graded[q.id] = isCorrect ? 'correct' : 'incorrect';
    }
    setResults(graded);
    setSubmitted(true);
    setShowWarning(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOverrideCorrect = (questionId: number) => {
    setResults({ ...results, [questionId]: 'correct' });
  };

  const correctCount = Object.values(results).filter((r) => r === 'correct').length;
  const incorrectCount = Object.values(results).filter((r) => r === 'incorrect').length;
  const percentage = submitted && totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  const handleRetryMissed = () => {
    const missedQuestions = quiz.questions.filter((q) => results[q.id] === 'incorrect');
    if (missedQuestions.length === 0) return;

    setQuiz({ ...quiz, questions: missedQuestions });
    setAnswers({});
    setFlagged(new Set());
    setResults({});
    setSubmitted(false);
    setShowWarning(false);
  };

  const getNavDotClass = (q: QuizQuestion) => {
    const classes = ['quiz-nav-dot'];
    if (submitted) {
      if (results[q.id] === 'correct') classes.push('correct');
      else if (results[q.id] === 'incorrect') classes.push('incorrect');
    } else {
      if (answers[q.id] !== undefined) classes.push('answered');
    }
    if (flagged.has(q.id)) classes.push('flagged');
    return classes.join(' ');
  };

  const getCardClass = (q: QuizQuestion) => {
    const classes = ['quiz-question-card'];
    if (!submitted && flagged.has(q.id)) classes.push('flagged');
    if (submitted) {
      if (results[q.id] === 'correct') classes.push('result-correct');
      else if (results[q.id] === 'incorrect') classes.push('result-incorrect');
    }
    return classes.join(' ');
  };

  const getOptionClass = (q: QuizQuestion, option: string) => {
    const classes = ['quiz-mc-option'];
    if (!submitted) {
      if (answers[q.id] === option) classes.push('selected');
    } else {
      const isCorrectAnswer = option.toLowerCase().trim() === q.answer.toLowerCase().trim();
      const isSelected = answers[q.id] === option;
      if (isCorrectAnswer) classes.push('result-correct');
      else if (isSelected) classes.push('result-incorrect');
    }
    return classes.join(' ');
  };

  const typeLabel = (type: string) => {
    if (type === 'multiple_choice') return 'Multiple Choice';
    if (type === 'true_false') return 'True / False';
    return 'Short Answer';
  };

  return (
    <div className="quiz-page">
      <div className="quiz-page-inner">
        {/* Top bar */}
        <div className="quiz-top-bar">
          <h1>{quiz.title}</h1>
          <button className="quiz-exit-btn" onClick={() => navigate(`/decks/${quiz.deck_id}`)}>
            Exit Quiz
          </button>
        </div>

        {/* Results header (only after submission) */}
        {submitted && (
          <div className="quiz-results-header">
            <h1>Quiz Complete</h1>
            <p className="quiz-results-subtitle">{quiz.title}</p>

            <div className="quiz-results-score">
              <div className="quiz-score-circle" data-score={percentage >= 70 ? 'good' : percentage >= 40 ? 'ok' : 'low'}>
                <span className="quiz-score-number">{percentage}%</span>
              </div>
              <div className="quiz-score-breakdown">
                <span className="score-correct">{correctCount} correct</span>
                <span className="score-incorrect">{incorrectCount} incorrect</span>
                {unansweredCount > 0 && (
                  <span className="score-unanswered">{unansweredCount} unanswered</span>
                )}
              </div>
            </div>

            <div className="quiz-results-actions">
              {incorrectCount > 0 && (
                <button className="quiz-retry-btn" onClick={handleRetryMissed}>
                  Retry Missed ({incorrectCount})
                </button>
              )}
              <button className="quiz-back-btn" onClick={() => navigate(`/decks/${quiz.deck_id}`)}>
                Back to Deck
              </button>
            </div>

            <hr className="quiz-results-divider" />
            <p className="quiz-results-label">Review Your Answers</p>
          </div>
        )}

        {/* Question navigator */}
        <div className="quiz-navigator">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              className={getNavDotClass(q)}
              onClick={() => scrollToQuestion(i)}
              title={`Question ${i + 1}${flagged.has(q.id) ? ' (flagged)' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Warning banner */}
        {showWarning && (
          <div className="quiz-warning-banner">
            <span className="quiz-warning-icon">&#9888;</span>
            <div className="quiz-warning-content">
              <p>You have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}.</p>
              <p className="quiz-warning-detail">
                Unanswered questions will be marked as incorrect. Are you sure you want to submit?
              </p>
              <div className="quiz-warning-actions">
                <button className="quiz-warning-submit" onClick={gradeQuiz}>
                  Submit Anyway
                </button>
                <button className="quiz-warning-cancel" onClick={() => {
                  setShowWarning(false);
                  scrollToQuestion(unansweredIndices[0]);
                }}>
                  Go to Unanswered
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All questions */}
        <div className="quiz-questions-scroll">
          {quiz.questions.map((q, i) => (
            <div
              key={q.id}
              className={getCardClass(q)}
              ref={(el) => { questionRefs.current[q.id] = el; }}
            >
              <div className="quiz-question-top">
                <span className="quiz-question-num">Question {i + 1}</span>
                {!submitted && (
                  <button
                    className={`quiz-flag-btn ${flagged.has(q.id) ? 'flagged' : ''}`}
                    onClick={() => toggleFlag(q.id)}
                  >
                    &#9873; {flagged.has(q.id) ? 'Flagged' : 'Flag'}
                  </button>
                )}
              </div>

              <span className="quiz-question-type-label">{typeLabel(q.question_type)}</span>
              <p className="quiz-question-prompt">{q.question}</p>

              {/* Multiple choice */}
              {q.question_type === 'multiple_choice' && q.options && (
                <div className="quiz-mc-options">
                  {q.options.map((option) => (
                    <button
                      key={option}
                      className={getOptionClass(q, option)}
                      onClick={() => handleSelectOption(q.id, option)}
                      disabled={submitted}
                    >
                      <span className="option-indicator" />
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* True/False */}
              {q.question_type === 'true_false' && (
                <div className="quiz-mc-options">
                  {['True', 'False'].map((option) => (
                    <button
                      key={option}
                      className={getOptionClass(q, option)}
                      onClick={() => handleSelectOption(q.id, option)}
                      disabled={submitted}
                    >
                      <span className="option-indicator" />
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* Short answer */}
              {q.question_type === 'short_answer' && (
                <input
                  type="text"
                  className={`quiz-sa-input ${submitted ? (results[q.id] === 'correct' ? 'result-correct' : 'result-incorrect') : ''}`}
                  placeholder="Type your answer..."
                  value={answers[q.id] ?? ''}
                  onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                  disabled={submitted}
                />
              )}

              {/* Per-question result feedback */}
              {submitted && (
                <div className={`quiz-result-feedback ${results[q.id]}`}>
                  <span>
                    {results[q.id] === 'correct' ? 'Correct' : `Incorrect — Answer: ${q.answer}`}
                  </span>
                  {results[q.id] === 'incorrect' && q.question_type === 'short_answer' && (
                    <button className="quiz-override-btn" onClick={() => handleOverrideCorrect(q.id)}>
                      Mark as Correct
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit button */}
        {!submitted && (
          <div className="quiz-submit-area">
            <button className="quiz-submit-btn" onClick={handleSubmitAttempt}>
              Submit Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizMode;
