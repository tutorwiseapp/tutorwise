#!/usr/bin/env node

/**
 * TutorWise AI Permission System
 * Implements Role-Based Access Control for AI automation
 */

import * as fs from 'fs';
import * as path from 'path';
import ApprovalWorkflow from './approval-workflow';

interface Restrictions {
  forbidden: string[];
  approvalRequired: string[];
  allowed: string[];
  roles: Record<string, unknown>;
  security: Record<string, unknown>;
}

interface PermissionResult {
  allowed: boolean;
  requires_approval: boolean;
  reason: string;
  escalation: string | null;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  resource: string;
  aiAgent: string;
  type: string;
  reason?: string;
}

class AIPermissionSystem {
  private restrictionsFile: string;
  private auditLogFile: string;
  private restrictions!: Restrictions;
  private approvalWorkflow: ApprovalWorkflow;

  constructor() {
    this.restrictionsFile = path.join(process.cwd(), '.ai-restrictions');
    this.auditLogFile = path.join(process.cwd(), 'logs/ai-audit.log');
    this.approvalWorkflow = new ApprovalWorkflow();
    this.loadRestrictions();
  }

  private loadRestrictions(): void {
    try {
      const content = fs.readFileSync(this.restrictionsFile, 'utf8');
      this.restrictions = this.parseRestrictions(content);
    } catch (error) {
      console.error('❌ CRITICAL: .ai-restrictions file not found');
      console.error('🚨 All AI actions blocked until restrictions file exists');
      process.exit(1);
    }
  }

  private parseRestrictions(content: string): Restrictions {
    const restrictions: Restrictions = {
      forbidden: [],
      approvalRequired: [],
      allowed: [],
      roles: {},
      security: {},
    };

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('=FORBIDDEN')) {
        restrictions.forbidden.push(line.split('=')[0]);
      } else if (line.includes('=APPROVAL_REQUIRED')) {
        restrictions.approvalRequired.push(line.split('=')[0]);
      } else if (line.includes('=ALLOWED')) {
        restrictions.allowed.push(line.split('=')[0]);
      }
    }
    return restrictions;
  }

  checkPermission(action: string, resource: string, aiAgent = 'cas-agent'): PermissionResult {
    const timestamp = new Date().toISOString();

    this.auditLog({ timestamp, action, resource, aiAgent, type: 'PERMISSION_CHECK' });

    // Scope violations
    const allowedPath = '/Users/michaelquan/projects/tutorwise';
    if (resource && !resource.startsWith(allowedPath)) {
      this.auditLog({ timestamp, action, resource, aiAgent, type: 'SCOPE_VIOLATION', reason: `Access outside project scope` });
      return { allowed: false, requires_approval: false, reason: `🚨 SCOPE VIOLATION`, escalation: 'SECURITY_TEAM' };
    }

    // Forbidden actions
    if (this.restrictions.forbidden.some(p => action.toUpperCase().includes(p) || resource.toUpperCase().includes(p))) {
      this.auditLog({ timestamp, action, resource, aiAgent, type: 'BLOCKED', reason: `Matches forbidden pattern` });
      return { allowed: false, requires_approval: false, reason: `🚨 FORBIDDEN`, escalation: 'SECURITY_TEAM' };
    }

    // Approval required actions
    if (this.restrictions.approvalRequired.some(p => action.toUpperCase().includes(p) || resource.toUpperCase().includes(p))) {
      this.auditLog({ timestamp, action, resource, aiAgent, type: 'APPROVAL_REQUIRED', reason: `Matches approval pattern` });
      return { allowed: false, requires_approval: true, reason: `📋 APPROVAL REQUIRED`, escalation: 'PROJECT_ADMIN' };
    }

    // Allowed actions
    if (this.restrictions.allowed.some(p => action.toUpperCase().includes(p) || resource.toUpperCase().includes(p))) {
      this.auditLog({ timestamp, action, resource, aiAgent, type: 'ALLOWED', reason: `Matches allowed pattern` });
      return { allowed: true, requires_approval: false, reason: `✅ ALLOWED`, escalation: null };
    }

    // Default block
    this.auditLog({ timestamp, action, resource, aiAgent, type: 'BLOCKED_DEFAULT', reason: 'No explicit permission' });
    return { allowed: false, requires_approval: true, reason: '🔒 DEFAULT BLOCK', escalation: 'HUMAN_ADMIN' };
  }

  private auditLog(entry: AuditEntry): void {
    const logDir = path.dirname(this.auditLogFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logEntry = `${entry.timestamp} [${entry.type}] ${entry.aiAgent}: ${entry.action} on ${entry.resource} - ${entry.reason || ''}\n`;
    fs.appendFileSync(this.auditLogFile, logEntry);
  }

  requestApproval(action: string, resource: string, justification: string, aiAgent: string) {
    return this.approvalWorkflow.createApprovalRequest(action, resource, justification, aiAgent);
  }
}

// CLI Interface
if (require.main === module) {
  const [,, action, resource, ...args] = process.argv;

  if (!action || !resource) {
    console.log('Usage: node ai-permission-system.js <action> <resource> [--ai-agent=<agent_id>]');
    process.exit(1);
  }

  const aiAgent = args.find(arg => arg.startsWith('--ai-agent='))?.split('=')[1] || 'unknown';
  const permissionSystem = new AIPermissionSystem();
  const result = permissionSystem.checkPermission(action, resource, aiAgent);

  console.log(`\n🤖 AI Permission Check Result: ${result.reason}`);

  if (result.requires_approval) {
    console.log(`\n📋 Creating approval request...`);
    permissionSystem.requestApproval(action, resource, 'AI agent requested permission', aiAgent);
  }

  process.exit(result.allowed ? 0 : 1);
}

export default AIPermissionSystem;