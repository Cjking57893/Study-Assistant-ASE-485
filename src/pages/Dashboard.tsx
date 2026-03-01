import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Logout even if the server call fails
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <span className="logo-icon">📚</span>
          StudyPal
        </div>
        <div className="dashboard-header-right">
          <span className="dashboard-user-name">{user.name || 'User'}</span>
          <button className="dashboard-logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <h1>Welcome back, {user.name?.split(' ')[0] || 'there'}!</h1>
        <p className="dashboard-placeholder">Your decks will appear here.</p>
      </main>
    </div>
  );
}

export default Dashboard;
