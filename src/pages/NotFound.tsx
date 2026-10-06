import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common';
import styles from './NotFound.module.css';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className={`page ${styles.page}`}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.text}>This page doesn&rsquo;t exist.</p>
      <Button onClick={() => navigate('/')}>Go Home</Button>
    </div>
  );
}
