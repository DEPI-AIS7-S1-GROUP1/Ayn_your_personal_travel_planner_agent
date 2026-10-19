import React from 'react';
import { Button } from '../Button';
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: '520px',
          margin: '64px auto',
          padding: '32px',
          background: 'var(--color-surface, #ffffff)',
          border: '2px solid var(--color-border, #e5e5e5)',
          borderRadius: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading, sans-serif)',
            fontSize: '22px',
            color: 'var(--color-error, #b00020)',
            marginBottom: '12px'
          }}>
            Something went wrong rendering this page
          </h2>
          <p style={{
            color: 'var(--color-text-muted, #666)',
            fontSize: '14px',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/trips';
              }}
            >
              Go to Your Trips
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
