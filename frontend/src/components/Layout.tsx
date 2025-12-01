import { Outlet } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Navigation from './Navigation';
import styles from './Layout.module.css';

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoverOpen, setHoverOpen] = useState(false);
  const collapseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expanded = !isCollapsed || hoverOpen;

  const clearCollapseTimeout = () => {
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
  };

  const handleToggle = () => {
    clearCollapseTimeout();
    setHoverOpen(false);
    setIsCollapsed(prev => !prev);
  };

  const handleHoverStart = () => {
    if (!isCollapsed) {
      return;
    }
    clearCollapseTimeout();
    setHoverOpen(true);
  };

  const handleHoverEnd = () => {
    if (!isCollapsed) {
      return;
    }
    clearCollapseTimeout();
    collapseTimeout.current = setTimeout(() => {
      setHoverOpen(false);
    }, 600);
  };

  useEffect(() => {
    if (!isCollapsed) {
      setHoverOpen(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isCollapsed || hoverOpen) {
        return;
      }
      if (event.clientX <= 32) {
        setHoverOpen(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isCollapsed, hoverOpen]);

  return (
    <div className={`${styles.root} ${expanded ? '' : styles.collapsed}`}>
      <Navigation
        collapsed={!expanded}
        onToggle={handleToggle}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
      />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
