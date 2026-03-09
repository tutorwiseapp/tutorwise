/**
 * CAS-Growth Integration Bridge
 *
 * Connects the Growth Agent with the CAS message bus.
 * Mirrors the pattern of sage-bridge and lexi-bridge.
 *
 * @module cas/integration/growth-bridge
 */

import { publish, createStatusEnvelope } from '../messages';

// --- Types ---

export interface GrowthAuditEvent {
  userId: string;
  userRole: string;
  auditType: string;
  findings: string[];
  score?: number;
  completedAt: string;
}

export interface GrowthSessionEvent {
  sessionId: string;
  userId: string;
  userRole: string;
  intent: string;
  startedAt: string;
  endedAt?: string;
}

export interface GrowthScoreEvent {
  userId: string;
  score: number;
  previousScore?: number;
  factors: string[];
  updatedAt: string;
}

// --- Bridge ---

export class GrowthBridge {
  private agentId = 'growth-agent';

  /**
   * Publishes a growth.audit_completed event to the platform bus.
   */
  async handleAuditCompleted(event: GrowthAuditEvent): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'growth.audit_completed',
        userId: event.userId,
        userRole: event.userRole,
        auditType: event.auditType,
        findingsCount: event.findings.length,
        score: event.score ?? null,
        completedAt: event.completedAt,
      });
      await publish(envelope);
    } catch (err) {
      console.error('[GrowthBridge] handleAuditCompleted error:', err);
    }
  }

  /**
   * Publishes a growth session started/ended event.
   */
  async handleSessionEvent(event: GrowthSessionEvent, type: 'started' | 'ended'): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: `growth.session.${type}`,
        sessionId: event.sessionId,
        userId: event.userId,
        userRole: event.userRole,
        intent: event.intent,
      });
      await publish(envelope);
    } catch (err) {
      console.error('[GrowthBridge] handleSessionEvent error:', err);
    }
  }

  /**
   * Publishes a growth.score_updated event.
   */
  async handleScoreUpdated(event: GrowthScoreEvent): Promise<void> {
    try {
      const envelope = createStatusEnvelope(this.agentId, {
        type: 'growth.score_updated',
        userId: event.userId,
        score: event.score,
        previousScore: event.previousScore ?? null,
        factorsCount: event.factors.length,
        updatedAt: event.updatedAt,
      });
      await publish(envelope);
    } catch (err) {
      console.error('[GrowthBridge] handleScoreUpdated error:', err);
    }
  }

  async getStatus() {
    return { connected: true, bridge: 'growth', pendingFeedback: 0 };
  }
}

export const growthBridge = new GrowthBridge();
