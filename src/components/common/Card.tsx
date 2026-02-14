import { type ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function Card({ children, className = '', onClick, interactive }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      className={`${styles.card} ${interactive || onClick ? styles.interactive : ''} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Component>
  );
}
