import { Link, NavLink, useLocation } from 'react-router-dom';
import { useActiveSession } from '../../hooks/useSessions';
import styles from './Nav.module.css';

const links = [
  { to: '/', label: 'Home' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/progressions', label: 'Progressions' },
  { to: '/templates', label: 'Templates' },
  { to: '/routines', label: 'Routines' },
  { to: '/history', label: 'History' },
  { to: '/progress', label: 'Progress' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

export function Nav() {
  const activeSession = useActiveSession();
  const location = useLocation();
  const hiddenPaths = ['/', '/workout'];
  const showWorkoutButton = !!activeSession && !hiddenPaths.includes(location.pathname);

  return (
    <nav className={styles.nav}>
      <Link to="/">
        <div className={styles.brand}>GymTracker</div>
      </Link>
      <ul className={styles.links}>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
      {showWorkoutButton && (
        <Link to="/workout" className={styles.workoutButton}>
          Workout
        </Link>
      )}
    </nav>
  );
}
