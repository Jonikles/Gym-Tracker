import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleFullReset = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-text)',
        }}>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 400 }}>
            The app hit an unexpected error. Your data is safe.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleFullReset}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Go Home
            </button>
          </div>
          {this.state.error && (
            <details style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', maxWidth: 400 }}>
              <summary style={{ cursor: 'pointer' }}>Error details</summary>
              <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
