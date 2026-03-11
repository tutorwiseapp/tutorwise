/**
 * Circuit Breaker Pattern for AI API Failures
 *
 * Extracted from cas/packages/core/src/runtime/CircuitBreaker.ts (Phase 6A).
 * Prevents cascading failures when AI APIs are experiencing issues.
 *
 * States:
 * - CLOSED: Normal operation (requests go through)
 * - OPEN: Too many failures (requests fail immediately)
 * - HALF_OPEN: Testing if service recovered (limited requests)
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringPeriod?: number;
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
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
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
      monitoringPeriod: config.monitoringPeriod ?? 120000,
      onStateChange: config.onStateChange ?? (() => {}),
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitBreakerOpenError(
          'Circuit breaker is OPEN — AI service unavailable',
          this.nextAttemptTime
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return true;
    return new Date() >= this.nextAttemptTime;
  }

  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) this.transitionToClosed();
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.failureCount++;
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.stateChangedAt = new Date();
    this.nextAttemptTime = undefined;
    this.config.onStateChange(CircuitState.CLOSED);
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.stateChangedAt = new Date();
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    this.config.onStateChange(CircuitState.OPEN);
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.failureCount = 0;
    this.stateChangedAt = new Date();
    this.config.onStateChange(CircuitState.HALF_OPEN);
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
    };
  }

  reset(): void { this.transitionToClosed(); }
  getState(): CircuitState { return this.state; }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string, public nextAttemptTime?: Date) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export function createAICircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    monitoringPeriod: 120000,
    onStateChange: (state) => {
      console.log(`[TeamRuntime CircuitBreaker] State changed to: ${state}`);
    },
  });
}
