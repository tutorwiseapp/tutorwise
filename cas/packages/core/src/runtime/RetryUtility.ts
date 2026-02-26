/**
 * Retry Utility with Exponential Backoff
 *
 * Provides intelligent retry logic for handling transient failures:
 * - Rate limiting (429)
 * - Network errors (timeout, connection reset)
 * - Temporary service unavailability (503, 504)
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry attempts and delays
 * - Error type classification
 * - Detailed logging
 */

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

export interface RetryResult<T> {
  result?: T;
  success: boolean;
  attempts: number;
  totalDelayMs: number;
  error?: any;
}

export class RetryUtility {
  private static readonly DEFAULT_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      '429', // Rate limiting
      '503', // Service unavailable
      '504', // Gateway timeout
      'ECONNRESET', // Connection reset
      'ETIMEDOUT', // Timeout
      'ENOTFOUND', // DNS lookup failed
      'Resource exhausted', // Gemini rate limit
      'Too Many Requests', // Generic rate limit
    ]
  };

  /**
   * Execute function with exponential backoff retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<RetryResult<T>> {
    const {
      maxAttempts,
      initialDelayMs,
      maxDelayMs,
      backoffMultiplier,
      retryableErrors,
      onRetry
    } = {
      ...this.DEFAULT_CONFIG,
      ...config
    };

    let lastError: any;
    let totalDelayMs = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();

        return {
          result,
          success: true,
          attempts: attempt,
          totalDelayMs
        };
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error, retryableErrors);

        // If not retryable or last attempt, throw
        if (!isRetryable || attempt === maxAttempts) {
          return {
            success: false,
            attempts: attempt,
            totalDelayMs,
            error
          };
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay; // +/- 30% jitter
        const delayMs = Math.min(baseDelay + jitter, maxDelayMs);

        totalDelayMs += delayMs;

        // Notify retry callback
        if (onRetry) {
          onRetry(attempt, error, delayMs);
        }

        console.log(
          `[RetryUtility] Attempt ${attempt}/${maxAttempts} failed: ${error.message}. ` +
          `Retrying in ${Math.round(delayMs)}ms...`
        );

        // Wait before retry
        await this.sleep(delayMs);
      }
    }

    // Should never reach here, but TypeScript needs this
    return {
      success: false,
      attempts: maxAttempts,
      totalDelayMs,
      error: lastError
    };
  }

  /**
   * Check if error is retryable based on error message/code
   */
  private static isRetryableError(error: any, retryableErrors: string[]): boolean {
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    const statusCode = error?.status?.toString() || '';

    // Check if error matches any retryable pattern
    for (const pattern of retryableErrors) {
      if (
        errorMessage.includes(pattern) ||
        errorCode.includes(pattern) ||
        statusCode === pattern
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract retry-after header value (for 429 responses)
   */
  static getRetryAfterMs(error: any): number | null {
    const retryAfter = error?.response?.headers?.['retry-after'];

    if (!retryAfter) {
      return null;
    }

    // If it's a number, it's seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // If it's a date string, calculate difference
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      return Math.max(0, retryDate.getTime() - Date.now());
    }

    return null;
  }

  /**
   * Classify error type for better handling
   */
  static classifyError(error: any): {
    type: 'rate_limit' | 'network' | 'auth' | 'validation' | 'server' | 'unknown';
    retryable: boolean;
    message: string;
  } {
    const errorMessage = error?.message || '';
    const statusCode = error?.status || error?.statusCode || 0;

    // Rate limiting
    if (statusCode === 429 || errorMessage.includes('Too Many Requests') || errorMessage.includes('Resource exhausted')) {
      return {
        type: 'rate_limit',
        retryable: true,
        message: 'Rate limit exceeded. Please retry after a delay.'
      };
    }

    // Network errors
    if (
      ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].some(code => errorMessage.includes(code)) ||
      statusCode === 504
    ) {
      return {
        type: 'network',
        retryable: true,
        message: 'Network error occurred. Connection may be unstable.'
      };
    }

    // Authentication errors
    if ([401, 403].includes(statusCode) || errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden')) {
      return {
        type: 'auth',
        retryable: false,
        message: 'Authentication failed. Check API credentials.'
      };
    }

    // Validation errors
    if ([400, 422].includes(statusCode) || errorMessage.includes('Invalid') || errorMessage.includes('Validation')) {
      return {
        type: 'validation',
        retryable: false,
        message: 'Request validation failed. Check input parameters.'
      };
    }

    // Server errors
    if ([500, 502, 503].includes(statusCode) || errorMessage.includes('Internal Server Error')) {
      return {
        type: 'server',
        retryable: true,
        message: 'Server error occurred. Service may be temporarily unavailable.'
      };
    }

    // Unknown
    return {
      type: 'unknown',
      retryable: false,
      message: errorMessage || 'Unknown error occurred'
    };
  }
}
