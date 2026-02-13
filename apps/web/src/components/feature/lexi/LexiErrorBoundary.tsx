'use client';

/**
 * Lexi Error Boundary
 *
 * Specialized error boundary for Lexi chat components.
 * Provides contextual error UI with retry functionality.
 *
 * @module components/feature/lexi/LexiErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styles from './LexiErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class LexiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error('[LexiErrorBoundary] Caught error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.errorCard}>
            <div className={styles.iconContainer}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M24 16V26M24 32V32.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 className={styles.title}>Oops! Lexi encountered an issue</h2>

            <p className={styles.message}>
              Something went wrong with the chat. Don&apos;t worry - your conversation history is safe.
            </p>

            <div className={styles.actions}>
              <button onClick={this.handleRetry} className={styles.retryButton}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 1V5H5M15 15V11H11M14.5 6.5A6.5 6.5 0 003 4M1.5 9.5A6.5 6.5 0 0013 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Try Again
              </button>

              <button onClick={this.handleReload} className={styles.reloadButton}>
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.details}>
                <summary className={styles.detailsSummary}>Technical Details</summary>
                <div className={styles.errorDetails}>
                  <pre className={styles.errorStack}>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { LexiErrorBoundary };
