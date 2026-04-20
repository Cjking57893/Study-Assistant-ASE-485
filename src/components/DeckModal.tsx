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
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);

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

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategoryId(cat.id.toString());
        setNewCategory('');
        loadCategories();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError('Failed to create category');
    }
  };

  const handleRenameCategory = async (catId: number) => {
    if (!editingCategoryName.trim()) return;
    try {
      const res = await api(`/api/categories/${catId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingCategoryName.trim() }),
      });
      if (res.ok) {
        setEditingCategoryId(null);
        setEditingCategoryName('');
        loadCategories();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError('Failed to rename category');
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    try {
      const res = await api(`/api/categories/${catId}`, { method: 'DELETE' });
      if (res.ok) {
        if (categoryId === catId.toString()) setCategoryId('');
        loadCategories();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError('Failed to delete category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId ? parseInt(categoryId) : null,
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

        {error && <div className="feedback-error">{error}</div>}

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
            <label htmlFor="deck-category">
              Category
              <button
                type="button"
                className="category-manage-toggle"
                onClick={() => setShowCategoryPanel(!showCategoryPanel)}
              >
                {showCategoryPanel ? 'Done' : 'Manage'}
              </button>
            </label>

            <select
              id="deck-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {showCategoryPanel && (
              <div className="category-panel">
                <div className="category-add-row">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    placeholder="New category name"
                  />
                  <button type="button" className="category-save-btn" onClick={handleAddCategory}>Add</button>
                </div>

                {categories.length > 0 && (
                  <div className="category-manage-list">
                    {categories.map((cat) => (
                      <div key={cat.id} className="category-manage-item">
                        {editingCategoryId === cat.id ? (
                          <div className="category-edit-row">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(cat.id)}
                              autoFocus
                            />
                            <button type="button" className="category-save-btn" onClick={() => handleRenameCategory(cat.id)}>Save</button>
                            <button type="button" className="category-cancel-btn" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span className="category-name">{cat.name}</span>
                            <div className="category-actions">
                              <button
                                type="button"
                                className="category-edit-btn"
                                onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                className="category-delete-btn"
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-submit-btn" disabled={loading}>
              {loading ? 'Saving...' : deck ? 'Save Changes' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
