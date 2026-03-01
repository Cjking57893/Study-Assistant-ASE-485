import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './DeckModal.css';

interface Category {
  id: number;
  name: string;
}

interface DeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  deck?: { id: number; title: string; description: string | null; category_id: number | null } | null;
}

export default function DeckModal({ isOpen, onClose, onSaved, deck }: DeckModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (deck) {
        setTitle(deck.title);
        setDescription(deck.description || '');
        setCategoryId(deck.category_id?.toString() || '');
      } else {
        setTitle('');
        setDescription('');
        setCategoryId('');
      }
      setNewCategory('');
      setError('');
    }
  }, [isOpen, deck]);

  const loadCategories = async () => {
    try {
      const res = await api('/api/categories');
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch {
      // Categories are optional
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalCategoryId = categoryId ? parseInt(categoryId) : null;

      if (newCategory.trim()) {
        const catRes = await api('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: newCategory.trim() }),
        });
        if (catRes.ok) {
          const cat = await catRes.json();
          finalCategoryId = cat.id;
        }
      }

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: finalCategoryId,
      };

      const url = deck ? `/api/decks/${deck.id}` : '/api/decks';
      const method = deck ? 'PUT' : 'POST';

      const res = await api(url, { method, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{deck ? 'Edit Deck' : 'Create Deck'}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="deck-title">Title</label>
            <input
              id="deck-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Calculus Chapter 1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="deck-description">Description (optional)</label>
            <textarea
              id="deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this deck about?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deck-category">Category</label>
            <select
              id="deck-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (e.target.value) setNewCategory('');
              }}
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="new-category">Or create new category</label>
            <input
              id="new-category"
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                if (e.target.value) setCategoryId('');
              }}
              placeholder="New category name"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Saving...' : deck ? 'Save Changes' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
