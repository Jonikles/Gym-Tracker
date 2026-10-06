import { useState, useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useActiveSession } from '../../hooks/useSessions';
import styles from './Nav.module.css';

type IconName =
  | 'home' | 'workout' | 'history' | 'progress' | 'analytics' | 'more'
  | 'exercises' | 'routines' | 'progressions' | 'templates' | 'settings' | 'chevron';

/** Simple 24px stroke icons (inline, no icon library) */
const ICON_PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v10.5a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
    </>
  ),
  workout: <path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12-7.5a.8.8 0 0 0 0-1.4l-12-7.5A.8.8 0 0 0 7 4.5Z" />,
  history: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  progress: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3" height="6" rx="1" />
      <rect x="10.5" y="5" width="3" height="12" rx="1" />
      <rect x="15.5" y="8" width="3" height="9" rx="1" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  exercises: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M6.5 12h11" />
      <path d="M3.5 9v6M20.5 9v6" />
    </>
  ),
  routines: (
    <>
      <path d="M17 2.5 20.5 6 17 9.5" />
      <path d="M3.5 11.5V10a4 4 0 0 1 4-4h13" />
      <path d="M7 21.5 3.5 18 7 14.5" />
      <path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13" />
    </>
  ),
  progressions: <path d="M3 20h5v-5h5v-5h5V5h3" />,
  templates: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
};

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/** Secondary links shown in the "More" sheet on mobile, and inline on desktop */
const secondaryLinks: { to: string; label: string; icon: IconName }[] = [
  { to: '/exercises', label: 'Exercises', icon: 'exercises' },
  { to: '/routines', label: 'Routines', icon: 'routines' },
  { to: '/progressions', label: 'Progressions', icon: 'progressions' },
  { to: '/templates', label: 'Templates', icon: 'templates' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
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
  { to: '/settings', label: 'Settings' },
];

export function Nav() {
  const activeSession = useActiveSession();
  const location = useLocation();
  // The More sheet is open only on the path it was opened from, so navigating closes it
  const [moreOpenOnPath, setMoreOpenOnPath] = useState<string | null>(null);
  const moreOpen = moreOpenOnPath === location.pathname;
  const setMoreOpen = (open: boolean) => setMoreOpenOnPath(open ? location.pathname : null);

  // Lock body scroll when more sheet is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  const hiddenPaths = ['/', '/workout'];
  const showWorkoutButton = !!activeSession && !hiddenPaths.includes(location.pathname);

  // Check if current path is a secondary link (to highlight "More" tab)
  const isOnSecondaryPage = secondaryLinks.some(
    (l) => location.pathname === l.to || location.pathname.startsWith(l.to + '/')
  );

  // Home/Workout toggle: show Workout when session is active, Home otherwise
  const homeWorkoutLink: { to: string; label: string; icon: IconName } = activeSession
    ? { to: '/workout', label: 'Workout', icon: 'workout' }
    : { to: '/', label: 'Home', icon: 'home' };

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.mobileTab} ${isActive ? styles.mobileTabActive : ''}`;

  return (
    <>
      {/* ── Desktop top bar ── */}
      <nav className={styles.desktopNav}>
        <Link to="/" className={styles.brandLink}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <Icon name="exercises" size={18} />
            </span>
            GymTracker
          </div>
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
            <span className={styles.liveDot} aria-hidden="true" />
            Workout
          </Link>
        )}
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className={styles.mobileNav}>
        <NavLink
          to={homeWorkoutLink.to}
          className={({ isActive }) =>
            `${styles.mobileTab} ${isActive ? styles.mobileTabActive : ''} ${
              activeSession ? styles.mobileTabLive : ''
            }`
          }
          end={homeWorkoutLink.to === '/'}
        >
          <span className={styles.mobileTabIcon}>
            <Icon name={homeWorkoutLink.icon} />
            {activeSession && <span className={styles.liveBadge} aria-hidden="true" />}
          </span>
          <span className={styles.mobileTabLabel}>{homeWorkoutLink.label}</span>
        </NavLink>

        <NavLink to="/history" className={tabClass}>
          <span className={styles.mobileTabIcon}><Icon name="history" /></span>
          <span className={styles.mobileTabLabel}>History</span>
        </NavLink>

        <NavLink to="/progress" className={tabClass}>
          <span className={styles.mobileTabIcon}><Icon name="progress" /></span>
          <span className={styles.mobileTabLabel}>Progress</span>
        </NavLink>

        <NavLink to="/analytics" className={tabClass}>
          <span className={styles.mobileTabIcon}><Icon name="analytics" /></span>
          <span className={styles.mobileTabLabel}>Analytics</span>
        </NavLink>

        {/* More button */}
        <button
          type="button"
          className={`${styles.mobileTab} ${isOnSecondaryPage || moreOpen ? styles.mobileTabActive : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
          aria-expanded={moreOpen}
        >
          <span className={styles.mobileTabIcon}><Icon name="more" /></span>
          <span className={styles.mobileTabLabel}>More</span>
        </button>
      </nav>

      {/* ── More sheet (mobile) ── */}
      {moreOpen && (
        <>
          <div className={styles.moreBackdrop} onClick={() => setMoreOpen(false)} />
          <div className={styles.moreSheet}>
            <div className={styles.moreHandle} aria-hidden="true" />
            <div className={styles.moreList}>
              {secondaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `${styles.moreLink} ${isActive ? styles.moreLinkActive : ''}`
                  }
                >
                  <span className={styles.moreIcon}>
                    <Icon name={link.icon} size={20} />
                  </span>
                  <span className={styles.moreLabel}>{link.label}</span>
                  <span className={styles.moreChevron}>
                    <Icon name="chevron" size={18} />
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
