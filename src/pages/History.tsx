import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import './History.css';

interface Session {
  id: number;
  deck_id: number;
  deck_title: string;
  total_cards: number;
  correct: number;
  completed_at: string;
}

function History() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await api('/api/sessions');
        if (res.ok) {
          setSessions(await res.json());
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

  const scorePercent = (correct: number, total: number) =>
    total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <span className="logo-icon">📚</span>
          StudyPal
        </div>
        <nav className="dashboard-nav">
          <button className="nav-link" onClick={() => navigate('/dashboard')}>Decks</button>
          <button className="nav-link" onClick={() => navigate('/history')}>History</button>
        </nav>
        <div className="dashboard-header-right">
          <button className="dashboard-logout-btn" onClick={logout}>Log Out</button>
        </div>
      </header>

      <main className="dashboard-content">
        <h1>Study History</h1>

        {loading ? (
          <p className="dashboard-placeholder">Loading...</p>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p>No study sessions yet. Review some flashcards to see your history here.</p>
          </div>
        ) : (
          <div className="history-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="history-item"
                onClick={() => navigate(`/decks/${session.deck_id}`)}
              >
                <div className="history-item-info">
                  <h3>{session.deck_title}</h3>
                  <span className="history-date">
                    {new Date(session.completed_at).toLocaleDateString()} at{' '}
                    {new Date(session.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="history-item-score">
                  <span className="score-text">
                    {session.correct}/{session.total_cards}
                  </span>
                  <span className={`score-percent ${scorePercent(session.correct, session.total_cards) >= 70 ? 'score-good' : 'score-low'}`}>
                    {scorePercent(session.correct, session.total_cards)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default History;
