/**
 * Base Persona
 *
 * Abstract base class for all Lexi personas.
 * Defines the interface that persona implementations must follow.
 *
 * @module lexi/personas
 */

import type { AgentContext } from '../../cas/packages/core/src/context';
import type {
  PersonaType,
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../types';
import { userAPI } from '../../cas/packages/user-api/src';

// --- Persona Interface ---

export interface IPersona {
  type: PersonaType;
  config: PersonaConfig;

  /**
   * Handle an incoming user intent
   */
  handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult>;

  /**
   * Get suggested actions for this persona
   */
  getSuggestedActions(ctx: AgentContext): Promise<string[]>;

  /**
   * Get the persona's greeting message
   */
  getGreeting(ctx: AgentContext): string;

  /**
   * Check if this persona can handle a specific intent category
   */
  canHandle(category: IntentCategory): boolean;
}

// --- Base Persona Class ---

export abstract class BasePersona implements IPersona {
  abstract type: PersonaType;
  abstract config: PersonaConfig;

  // Shared API access
  protected api = userAPI;

  /**
   * Handle an incoming user intent - must be implemented by subclasses
   */
  abstract handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult>;

  /**
   * Get suggested actions based on context
   */
  abstract getSuggestedActions(ctx: AgentContext): Promise<string[]>;

  /**
   * Get personalized greeting
   */
  getGreeting(ctx: AgentContext): string {
    const userName = ctx.user?.metadata?.displayName as string || 'there';
    return this.config.defaultGreeting.replace('{name}', userName);
  }

  /**
   * Check if this persona handles a category
   */
  canHandle(category: IntentCategory): boolean {
    return this.getHandledCategories().includes(category);
  }

  /**
   * Get categories this persona handles - override in subclasses
   */
  protected abstract getHandledCategories(): IntentCategory[];

  // --- Shared Helper Methods ---

  /**
   * Format a success response
   */
  protected success(message: string, data?: unknown, nextSteps?: string[]): ActionResult {
    return {
      success: true,
      message,
      data,
      nextSteps,
    };
  }

  /**
   * Format an error response
   */
  public error(message: string, error?: string): ActionResult {
    return {
      success: false,
      message,
      error,
    };
  }

  /**
   * Format a confirmation request
   */
  protected confirm(message: string, action: string): ActionResult {
    return {
      success: true,
      message,
      nextSteps: [`Confirm: ${action}`, 'Cancel'],
    };
  }

  /**
   * Log persona activity
   */
  protected log(action: string, ctx: AgentContext, details?: Record<string, unknown>): void {
    console.log(`[Lexi:${this.type}] ${action}`, {
      userId: ctx.user?.id,
      traceId: ctx.traceId,
      ...details,
    });
  }
}

// --- Intent Handler Registry ---

export type IntentHandler = (
  intent: DetectedIntent,
  ctx: AgentContext
) => Promise<ActionResult>;

export interface IntentHandlerMap {
  [category: string]: {
    [action: string]: IntentHandler;
  };
}

/**
 * Mixin for registering intent handlers
 */
export function withIntentHandlers<T extends BasePersona>(
  persona: T,
  handlers: IntentHandlerMap
): T & { registeredHandlers: IntentHandlerMap } {
  return Object.assign(persona, {
    registeredHandlers: handlers,
    async handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      const categoryHandlers = handlers[intent.category];
      if (!categoryHandlers) {
        return persona.error(`I can't help with ${intent.category} requests.`);
      }

      const handler = categoryHandlers[intent.action];
      if (!handler) {
        return persona.error(`I don't know how to ${intent.action} for ${intent.category}.`);
      }

      return handler.call(persona, intent, ctx);
    },
  });
}

export default BasePersona;
