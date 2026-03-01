import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import DeckModal from '../components/DeckModal';
import AppHeader from '../components/AppHeader';
import './Dashboard.css';

interface Deck {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  flashcard_count: number;
  quiz_count: number;
  last_studied: string | null;
}

function Dashboard() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDeck, setEditDeck] = useState<Deck | null>(null);

  const loadDecks = async () => {
    try {
      const res = await api('/api/decks');
      if (res.ok) {
        setDecks(await res.json());
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const handleDeleteDeck = async (deckId: number) => {
    try {
      const res = await api(`/api/decks/${deckId}`, { method: 'DELETE' });
      if (res.ok) {
        setDecks((prev) => prev.filter((d) => d.id !== deckId));
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="dashboard-page">
      <AppHeader />

      <main className="dashboard-content">
        <div className="dashboard-title-row">
          <h1>Your Decks</h1>
          <button className="create-deck-btn" onClick={() => { setEditDeck(null); setShowModal(true); }}>
            + Create Deck
          </button>
        </div>

        {loading ? (
          <p className="dashboard-placeholder">Loading...</p>
        ) : decks.length === 0 ? (
          <div className="empty-state">
            <p>No decks yet. Create your first deck to get started!</p>
          </div>
        ) : (
          <div className="deck-grid">
            {decks.map((deck) => (
              <div key={deck.id} className="deck-card" onClick={() => navigate(`/decks/${deck.id}`)}>
                <div className="deck-card-header">
                  <h3>{deck.title}</h3>
                  <div className="deck-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="deck-action-btn"
                      onClick={() => { setEditDeck(deck); setShowModal(true); }}
                      title="Edit deck"
                    >
                      Edit
                    </button>
                    <button
                      className="deck-action-btn deck-delete-btn"
                      onClick={() => handleDeleteDeck(deck.id)}
                      title="Delete deck"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {deck.category_name && (
                  <span className="deck-category-badge">{deck.category_name}</span>
                )}
                {deck.description && (
                  <p className="deck-card-description">{deck.description}</p>
                )}
                <div className="deck-card-stats">
                  <span>{deck.flashcard_count} cards</span>
                  <span>{deck.quiz_count} quizzes</span>
                </div>
                {deck.last_studied && (
                  <p className="deck-last-studied">
                    Last studied {new Date(deck.last_studied).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <DeckModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaved={loadDecks}
        deck={editDeck}
      />
    </div>
  );
}

export default Dashboard;
