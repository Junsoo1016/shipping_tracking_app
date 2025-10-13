import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import styles from './Layout.module.css';

const Layout = () => (
  <div className={styles.root}>
    <Navigation />
    <main className={styles.content}>
      <Outlet />
    </main>
  </div>
);

export default Layout;
