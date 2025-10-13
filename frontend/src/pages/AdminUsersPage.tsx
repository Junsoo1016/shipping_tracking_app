import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../hooks/useUsers';
import styles from './AdminUsersPage.module.css';

const AdminUsersPage = () => {
  const { role } = useAuth();
  const { users, loading, error, setRole } = useUsers();

  if (role !== 'admin') {
    return (
      <div className={styles.container}>
        <h2>Permission required</h2>
        <p>You need administrator access to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className={styles.container}>
      <header>
        <h2>User Management</h2>
        <p>Promote users to admin or revoke access.</p>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Email</span>
          <span>Role</span>
          <span>Actions</span>
        </div>

        {users.length === 0 ? (
          <div className={styles.empty}>No users available.</div>
        ) : (
          users.map(user => (
            <div key={user.id} className={styles.tableRow}>
              <span>{user.email}</span>
              <span>{user.role}</span>
              <span className={styles.actions}>
                <button type="button" disabled={user.role === 'admin'} onClick={() => setRole(user.id, 'admin')}>
                  Promote to admin
                </button>
                <button type="button" disabled={user.role === 'user'} onClick={() => setRole(user.id, 'user')}>
                  Demote to user
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
