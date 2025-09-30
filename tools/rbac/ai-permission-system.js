#!/usr/bin/env node

/**
 * TutorWise AI Permission System
 * Implements Role-Based Access Control for AI automation
 *
 * Usage: node ai-permission-system.js <action> <resource> [--ai-agent=<agent_id>]
 */

const fs = require('fs');
const path = require('path');

class AIPermissionSystem {
  constructor() {
    this.restrictionsFile = path.join(process.cwd(), '.ai-restrictions');
    this.auditLogFile = path.join(process.cwd(), 'logs/ai-audit.log');
    this.loadRestrictions();
  }

  loadRestrictions() {
    try {
      const content = fs.readFileSync(this.restrictionsFile, 'utf8');
      this.restrictions = this.parseRestrictions(content);
    } catch (error) {
      console.error('❌ CRITICAL: .ai-restrictions file not found');
      console.error('🚨 All AI actions blocked until restrictions file exists');
      process.exit(1);
    }
  }

  parseRestrictions(content) {
    const restrictions = {
      forbidden: [],
      approvalRequired: [],
      allowed: [],
      roles: {},
      security: {}
    };

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('=FORBIDDEN')) {
        const action = line.split('=')[0];
        restrictions.forbidden.push(action);
      } else if (line.includes('=APPROVAL_REQUIRED')) {
        const action = line.split('=')[0];
        restrictions.approvalRequired.push(action);
      } else if (line.includes('=ALLOWED')) {
        const action = line.split('=')[0];
        restrictions.allowed.push(action);
      }
    }

    return restrictions;
  }

  checkPermission(action, resource, aiAgent = 'claude-code') {
    const timestamp = new Date().toISOString();

    // Log all permission checks
    this.auditLog({
      timestamp,
      action,
      resource,
      aiAgent,
      type: 'PERMISSION_CHECK'
    });

    // Check if action is forbidden
    for (const forbidden of this.restrictions.forbidden) {
      if (action.toUpperCase().includes(forbidden) || resource.toUpperCase().includes(forbidden)) {
        this.auditLog({
          timestamp,
          action,
          resource,
          aiAgent,
          type: 'BLOCKED',
          reason: `Matches forbidden pattern: ${forbidden}`
        });
        return {
          allowed: false,
          requires_approval: false,
          reason: `🚨 FORBIDDEN: Action blocked by security policy (${forbidden})`,
          escalation: 'SECURITY_TEAM'
        };
      }
    }

    // Check if approval required
    for (const approvalPattern of this.restrictions.approvalRequired) {
      if (action.toUpperCase().includes(approvalPattern) || resource.toUpperCase().includes(approvalPattern)) {
        this.auditLog({
          timestamp,
          action,
          resource,
          aiAgent,
          type: 'APPROVAL_REQUIRED',
          reason: `Matches approval pattern: ${approvalPattern}`
        });
        return {
          allowed: false,
          requires_approval: true,
          reason: `📋 APPROVAL REQUIRED: Human authorization needed (${approvalPattern})`,
          escalation: 'PROJECT_ADMIN'
        };
      }
    }

    // Check if explicitly allowed
    for (const allowedPattern of this.restrictions.allowed) {
      if (action.toUpperCase().includes(allowedPattern) || resource.toUpperCase().includes(allowedPattern)) {
        this.auditLog({
          timestamp,
          action,
          resource,
          aiAgent,
          type: 'ALLOWED',
          reason: `Matches allowed pattern: ${allowedPattern}`
        });
        return {
          allowed: true,
          requires_approval: false,
          reason: `✅ ALLOWED: Action permitted by policy (${allowedPattern})`,
          escalation: null
        };
      }
    }

    // Default: Block unknown actions (secure by default)
    this.auditLog({
      timestamp,
      action,
      resource,
      aiAgent,
      type: 'BLOCKED_DEFAULT',
      reason: 'No explicit permission found - secure by default'
    });

    return {
      allowed: false,
      requires_approval: true,
      reason: '🔒 DEFAULT BLOCK: Unknown action requires human approval',
      escalation: 'HUMAN_ADMIN'
    };
  }

  auditLog(entry) {
    const logDir = path.dirname(this.auditLogFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = `${entry.timestamp} [${entry.type}] ${entry.aiAgent}: ${entry.action} on ${entry.resource} - ${entry.reason}\n`;
    fs.appendFileSync(this.auditLogFile, logEntry);
  }

  requestApproval(action, resource, justification) {
    const approvalRequest = {
      id: `APPROVAL_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      resource,
      justification,
      status: 'PENDING',
      requested_by: 'AI_AGENT',
      requires_human_approval: true
    };

    // Save approval request
    const approvalFile = path.join(process.cwd(), 'logs/approval-requests.json');
    let requests = [];

    try {
      if (fs.existsSync(approvalFile)) {
        requests = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load existing approval requests');
    }

    requests.push(approvalRequest);
    fs.writeFileSync(approvalFile, JSON.stringify(requests, null, 2));

    console.log(`📋 APPROVAL REQUEST CREATED: ${approvalRequest.id}`);
    console.log(`📁 File: ${approvalFile}`);
    console.log(`⏰ Status: Waiting for human approval`);

    return approvalRequest;
  }
}

// CLI Interface
if (require.main === module) {
  const [,, action, resource, ...args] = process.argv;

  if (!action || !resource) {
    console.log('Usage: node ai-permission-system.js <action> <resource> [--ai-agent=<agent_id>]');
    console.log('Example: node ai-permission-system.js DEPLOY PRODUCTION --ai-agent=claude-code');
    process.exit(1);
  }

  const aiAgent = args.find(arg => arg.startsWith('--ai-agent='))?.split('=')[1] || 'unknown';

  const permissionSystem = new AIPermissionSystem();
  const result = permissionSystem.checkPermission(action, resource, aiAgent);

  console.log(`\n🤖 AI Permission Check Result:`);
  console.log(`Action: ${action}`);
  console.log(`Resource: ${resource}`);
  console.log(`Agent: ${aiAgent}`);
  console.log(`Result: ${result.reason}`);

  if (!result.allowed && result.requires_approval) {
    console.log(`\n📋 Creating approval request...`);
    const approval = permissionSystem.requestApproval(
      action,
      resource,
      'AI agent requested permission for this action'
    );
  }

  process.exit(result.allowed ? 0 : 1);
}

module.exports = AIPermissionSystem;