import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaAddressBook,
  FaBars,
  FaBoxArchive,
  FaChartPie,
  FaMoneyBillWave,
  FaRightFromBracket,
  FaTruckFast,
  FaUsers
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import styles from './Navigation.module.css';

type NavigationProps = {
  collapsed: boolean;
  onToggle: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
};

const Navigation = ({ collapsed, onToggle, onHoverStart, onHoverEnd }: NavigationProps) => {
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const items = [
    { to: '/', label: 'Dashboard', icon: FaChartPie, exact: true },
    { type: 'section', label: 'Monitor' },
    { to: '/monitor/active', label: 'Active Orders', icon: FaTruckFast },
    { to: '/monitor/archive', label: 'Archive', icon: FaBoxArchive },
    { type: 'section', label: 'Finance' },
    { to: '/finance/offers', label: 'Offer List', icon: FaMoneyBillWave },
    { type: 'section', label: 'Contacts' },
    { to: '/contacts', label: '연락처', icon: FaAddressBook }
  ];

  if (role === 'admin') {
    items.push({ type: 'section', label: 'Admin' });
    items.push({ to: '/admin/users', label: 'User Management', icon: FaUsers });
  }

  const renderLink = (to: string, label: string, Icon: React.ComponentType<{ className?: string }>, exact?: boolean) => (
    <NavLink
      key={to}
      to={to}
      end={Boolean(exact)}
      className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
    >
      <Icon className={styles.navIcon} />
      {!collapsed && <span className={styles.linkLabel}>{label}</span>}
    </NavLink>
  );

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div className={styles.brandRow}>
        <button type="button" onClick={onToggle} className={styles.toggleButton} aria-label="Toggle sidebar">
          <FaBars />
        </button>
        {!collapsed && <div className={styles.brand}>JJI Admin</div>}
      </div>

      <nav className={styles.nav}>
        {items.map(item => {
          if ('type' in item) {
            return (
              <div key={item.label} className={styles.sectionLabel}>
                {!collapsed && item.label}
              </div>
            );
          }
          return renderLink(item.to, item.label, item.icon, item.exact);
        })}
      </nav>

      <footer className={styles.footer}>
        {!collapsed && <div className={styles.userEmail}>{user?.email}</div>}
        <button type="button" onClick={handleSignOut} className={styles.signOut}>
          <FaRightFromBracket />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </footer>
    </aside>
  );
};

export default Navigation;
