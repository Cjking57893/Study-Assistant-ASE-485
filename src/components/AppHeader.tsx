import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AppHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
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
        <span className="dashboard-user-name">{user?.name || 'User'}</span>
        <button className="dashboard-logout-btn" onClick={logout}>Log Out</button>
      </div>
    </header>
  );
}

export default AppHeader;
