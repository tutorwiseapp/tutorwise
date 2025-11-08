/**
 * Sentry Client-Side Configuration
 * Captures errors and performance metrics in the browser
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

  // Session Replay
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
  replaysSessionSampleRate: 0.1, // Capture 10% of normal sessions

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Trace propagation for React Query and API calls
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.tutorwise\.io/,
    /^https:\/\/.*\.supabase\.co/,
  ],

  // Filter out noise
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'canvas.contentDocument',
    // Network errors
    'Network request failed',
    'Failed to fetch',
    // React Query automatic retries (expected behavior)
    'Request failed with status code',
  ],

  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry]', event);
      return null;
    }

    // Filter out known third-party errors
    if (event.exception) {
      const firstException = event.exception.values?.[0];
      if (firstException?.value?.includes('ResizeObserver')) {
        return null;
      }
    }

    return event;
  },
});
