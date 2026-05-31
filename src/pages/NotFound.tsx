import { Link } from 'react-router-dom';
import { Button } from '../components/common';

export function NotFound() {
  return (
    <div className="page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 'var(--space-md)',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '4rem', margin: 0, lineHeight: 1 }}>404</h1>
      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Page not found</p>
      <Link to="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
