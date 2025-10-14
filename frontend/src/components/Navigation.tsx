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
        <span className={styles.brandLogo}>JJI</span>
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
