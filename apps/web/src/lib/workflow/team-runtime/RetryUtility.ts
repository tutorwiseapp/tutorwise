/**
 * Retry Utility with Exponential Backoff
 *
 * Extracted from cas/packages/core/src/runtime/RetryUtility.ts (Phase 6A).
 * Handles transient AI API failures: rate limiting (429), timeouts, 503/504.
 */

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

export interface RetryResult<T> {
  result?: T;
  success: boolean;
  attempts: number;
  totalDelayMs: number;
  error?: unknown;
}

export class RetryUtility {
  private static readonly DEFAULT_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      '429',
      '503',
      '504',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Resource exhausted',
      'Too Many Requests',
    ],
  };

  static async withRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<RetryResult<T>> {
    const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier, retryableErrors, onRetry } = {
      ...this.DEFAULT_CONFIG,
      ...config,
    };

    let lastError: unknown;
    let totalDelayMs = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        return { result, success: true, attempts: attempt, totalDelayMs };
      } catch (error: unknown) {
        lastError = error;
        const isRetryable = this.isRetryableError(error, retryableErrors);
        if (!isRetryable || attempt === maxAttempts) {
          return { success: false, attempts: attempt, totalDelayMs, error };
        }

        const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay;
        const delayMs = Math.min(baseDelay + jitter, maxDelayMs);
        totalDelayMs += delayMs;

        if (onRetry) onRetry(attempt, error, delayMs);
        console.log(`[RetryUtility] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(delayMs)}ms...`);
        await this.sleep(delayMs);
      }
    }

    return { success: false, attempts: maxAttempts, totalDelayMs, error: lastError };
  }

  private static isRetryableError(error: unknown, retryableErrors: string[]): boolean {
    const e = error as Record<string, unknown>;
    const msg = String(e?.message ?? '');
    const code = String(e?.code ?? '');
    const status = String(e?.status ?? '');
    return retryableErrors.some((p) => msg.includes(p) || code.includes(p) || status === p);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
