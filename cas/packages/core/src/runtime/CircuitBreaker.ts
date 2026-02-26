/**
 * Circuit Breaker Pattern for AI API Failures
 *
 * Prevents cascading failures when AI APIs are experiencing issues.
 *
 * States:
 * - CLOSED: Normal operation (requests go through)
 * - OPEN: Too many failures (requests fail immediately)
 * - HALF_OPEN: Testing if service recovered (limited requests)
 *
 * Use cases:
 * - AI API rate limits (429 errors)
 * - AI API downtime (500 errors)
 * - Network timeouts
 * - Service degradation
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening (default: 5)
  successThreshold: number;       // Number of successes in half-open before closing (default: 2)
  timeout: number;                // Time in ms before trying half-open (default: 60000 = 1 min)
  monitoringPeriod?: number;      // Time window for counting failures (default: 120000 = 2 min)
  onStateChange?: (state: CircuitState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangedAt: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private stateChangedAt: Date = new Date();
  private nextAttemptTime?: Date;

  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      successThreshold: config.successThreshold,
      timeout: config.timeout,
      monitoringPeriod: config.monitoringPeriod || 120000, // 2 minutes
      onStateChange: config.onStateChange || (() => {})
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitBreakerOpenError(
          'Circuit breaker is OPEN - service unavailable',
          this.nextAttemptTime
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Check if we should attempt to reset (transition to half-open)
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return true;
    return new Date() >= this.nextAttemptTime;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: any): void {
    this.lastFailureTime = new Date();
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've exceeded failure threshold
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.stateChangedAt = new Date();
    this.nextAttemptTime = undefined;
    this.config.onStateChange(CircuitState.CLOSED);
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.stateChangedAt = new Date();
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    this.config.onStateChange(CircuitState.OPEN);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.failureCount = 0;
    this.stateChangedAt = new Date();
    this.config.onStateChange(CircuitState.HALF_OPEN);
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionToClosed();
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public nextAttemptTime?: Date
  ) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Create a circuit breaker for AI API calls
 */
export function createAICircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,           // Open after 5 failures
    successThreshold: 2,            // Close after 2 successes in half-open
    timeout: 60000,                 // Wait 1 minute before trying again
    monitoringPeriod: 120000,       // 2-minute window for failures
    onStateChange: (state) => {
      console.log(`[CircuitBreaker] State changed to: ${state}`);
    }
  });
}
