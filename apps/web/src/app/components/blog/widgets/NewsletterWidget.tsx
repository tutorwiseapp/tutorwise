/**
 * Filename: apps/web/src/app/components/blog/widgets/NewsletterWidget.tsx
 * Purpose: Right sidebar widget for blog newsletter subscription
 * Created: 2026-01-15
 */

'use client';

import { useState } from 'react';
import styles from './NewsletterWidget.module.css';

export default function NewsletterWidget() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus('loading');

    // TODO: Implement actual newsletter subscription API call
    // For now, simulate success after 1 second
    setTimeout(() => {
      setStatus('success');
      setEmail('');

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }, 1000);
  };

  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>📬 Subscribe to our newsletter</h3>
      <p className={styles.widgetDescription}>
        Get the latest tutoring insights, tips, and industry news delivered to your inbox weekly.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          disabled={status === 'loading' || status === 'success'}
          required
        />
        <button
          type="submit"
          className={styles.button}
          disabled={status === 'loading' || status === 'success'}
        >
          {status === 'loading' && 'Subscribing...'}
          {status === 'success' && '✓ Subscribed!'}
          {status === 'idle' && 'Subscribe'}
          {status === 'error' && 'Try Again'}
        </button>
      </form>

      {status === 'success' && (
        <p className={styles.successMessage}>
          Thanks for subscribing! Check your email to confirm.
        </p>
      )}

      {status === 'error' && (
        <p className={styles.errorMessage}>
          Something went wrong. Please try again.
        </p>
      )}

      <p className={styles.disclaimer}>
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
