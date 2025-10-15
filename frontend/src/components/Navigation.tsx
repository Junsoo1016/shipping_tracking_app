import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navigation.module.css';

const Navigation = () => {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandLogo} aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 16c4 0 5-6 9-6s5 6 9 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 18h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 8c1.657 0 3-1.79 3-4s-1.343-3-3-3-3 1.79-3 4 1.343 3 3 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.brandText}>ShipTrack</span>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : '')}>
          Dashboard
        </NavLink>
        <div className={styles.sectionLabel}>Monitor</div>
        <NavLink to="/monitor/active" className={({ isActive }) => (isActive ? styles.active : '')}>
          Active Orders
        </NavLink>
        <NavLink to="/monitor/archive" className={({ isActive }) => (isActive ? styles.active : '')}>
          Archive
        </NavLink>
        {role === 'admin' && (
          <>
            <div className={styles.sectionLabel}>Admin</div>
            <NavLink to="/admin/users" className={({ isActive }) => (isActive ? styles.active : '')}>
              User Management
            </NavLink>
          </>
        )}
      </nav>

      <footer className={styles.footer}>
        <div className={styles.userEmail}>{user?.email}</div>
        <button type="button" onClick={handleSignOut} className={styles.signOut}>
          Sign Out
        </button>
      </footer>
    </aside>
  );
};

export default Navigation;
