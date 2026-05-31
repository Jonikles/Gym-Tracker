import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useActiveSession } from '../../hooks/useSessions';
import styles from './Nav.module.css';

/** Primary tabs shown in the bottom bar on mobile */
const primaryLinks = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/workout', label: 'Workout', icon: '▶' },
  { to: '/exercises', label: 'Exercises', icon: '◎' },
  { to: '/history', label: 'History', icon: '☰' },
  { to: '/progress', label: 'Progress', icon: '↗' },
];

/** Secondary links shown in the "More" sheet on mobile, and inline on desktop */
const secondaryLinks = [
  { to: '/progressions', label: 'Progressions' },
  { to: '/templates', label: 'Templates' },
  { to: '/routines', label: 'Routines' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/tools', label: 'Tools' },
  { to: '/body', label: 'Body' },
  { to: '/settings', label: 'Settings' },
];

const allLinks = [
  { to: '/', label: 'Home' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/progressions', label: 'Progressions' },
  { to: '/templates', label: 'Templates' },
  { to: '/routines', label: 'Routines' },
  { to: '/history', label: 'History' },
  { to: '/progress', label: 'Progress' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/tools', label: 'Tools' },
  { to: '/body', label: 'Body' },
  { to: '/settings', label: 'Settings' },
];

export function Nav() {
  const activeSession = useActiveSession();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close more sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const hiddenPaths = ['/', '/workout'];
  const showWorkoutButton = !!activeSession && !hiddenPaths.includes(location.pathname);

  // Check if current path is a secondary link (to highlight "More" tab)
  const isOnSecondaryPage = secondaryLinks.some(
    (l) => location.pathname === l.to || location.pathname.startsWith(l.to + '/')
  );

  return (
    <>
      {/* ── Desktop top bar ── */}
      <nav className={styles.desktopNav}>
        <Link to="/">
          <div className={styles.brand}>GymTracker</div>
        </Link>
        <ul className={styles.desktopLinks}>
          {allLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `${styles.desktopLink} ${isActive ? styles.active : ''}`
                }
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {showWorkoutButton && (
          <Link to="/workout" className={styles.desktopWorkoutBtn}>
            Workout
          </Link>
        )}
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className={styles.mobileNav}>
        {primaryLinks.map((link) => {
          // Special case: Workout tab shows active session indicator
          const isWorkout = link.to === '/workout';
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${styles.mobileTab} ${isActive ? styles.mobileTabActive : ''} ${
                  isWorkout && activeSession ? styles.mobileTabLive : ''
                }`
              }
              end={link.to === '/'}
            >
              <span className={styles.mobileTabIcon}>{link.icon}</span>
              <span className={styles.mobileTabLabel}>{link.label}</span>
            </NavLink>
          );
        })}
        {/* More button */}
        <button
          className={`${styles.mobileTab} ${isOnSecondaryPage || moreOpen ? styles.mobileTabActive : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <span className={styles.mobileTabIcon}>⋯</span>
          <span className={styles.mobileTabLabel}>More</span>
        </button>
      </nav>

      {/* ── More sheet (mobile) ── */}
      {moreOpen && (
        <>
          <div className={styles.moreBackdrop} onClick={() => setMoreOpen(false)} />
          <div className={styles.moreSheet}>
            {secondaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${styles.moreLink} ${isActive ? styles.moreLinkActive : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </>
      )}
    </>
  );
}
