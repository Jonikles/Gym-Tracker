import { Link, NavLink } from 'react-router-dom';
import styles from './Nav.module.css';

const links = [
  { to: '/', label: 'Home' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/templates', label: 'Templates' },
  { to: '/routines', label: 'Routines' },
  { to: '/history', label: 'History' },
  { to: '/progress', label: 'Progress' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
];

export function Nav() {
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
    </nav>
  );
}
