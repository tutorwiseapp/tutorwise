#!/usr/bin/env node

/**
 * TutorWise AI Approval Workflow System
 * Manages human approval process for sensitive AI actions
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class ApprovalWorkflow {
  constructor() {
    this.approvalFile = path.join(process.cwd(), 'logs/approval-requests.json');
    this.auditFile = path.join(process.cwd(), 'logs/approval-audit.log');
    this.ensureLogDirs();
  }

  ensureLogDirs() {
    const logDir = path.dirname(this.approvalFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  loadPendingRequests() {
    try {
      if (!fs.existsSync(this.approvalFile)) {
        return [];
      }
      return JSON.parse(fs.readFileSync(this.approvalFile, 'utf8'));
    } catch (error) {
      console.error('Error loading approval requests:', error);
      return [];
    }
  }

  savePendingRequests(requests) {
    fs.writeFileSync(this.approvalFile, JSON.stringify(requests, null, 2));
  }

  auditLog(entry) {
    const logEntry = `${new Date().toISOString()} [${entry.type}] ${entry.action} - ${entry.details}\n`;
    fs.appendFileSync(this.auditFile, logEntry);
  }

  createApprovalRequest(action, resource, justification, aiAgent = 'claude-code') {
    const request = {
      id: `APPROVAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      resource,
      justification,
      aiAgent,
      status: 'PENDING',
      created_by: aiAgent,
      approved_by: null,
      approval_timestamp: null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      risk_level: this.assessRiskLevel(action, resource)
    };

    const requests = this.loadPendingRequests();
    requests.push(request);
    this.savePendingRequests(requests);

    this.auditLog({
      type: 'APPROVAL_REQUESTED',
      action: `${action} on ${resource}`,
      details: `AI agent ${aiAgent} requested approval: ${justification}`
    });

    return request;
  }

  assessRiskLevel(action, resource) {
    const highRiskPatterns = ['PRODUCTION', 'DATABASE', 'SECRET', 'KEY', 'PASSWORD', 'DEPLOY'];
    const mediumRiskPatterns = ['STAGING', 'API', 'MIDDLEWARE', 'AUTH'];

    const actionUpper = action.toUpperCase();
    const resourceUpper = resource.toUpperCase();

    if (highRiskPatterns.some(pattern => actionUpper.includes(pattern) || resourceUpper.includes(pattern))) {
      return 'HIGH';
    }
    if (mediumRiskPatterns.some(pattern => actionUpper.includes(pattern) || resourceUpper.includes(pattern))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  async processApprovalRequest(requestId, approved, approver, notes = '') {
    const requests = this.loadPendingRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);

    if (requestIndex === -1) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    const request = requests[requestIndex];

    // Check if expired
    if (new Date() > new Date(request.expires_at)) {
      request.status = 'EXPIRED';
      this.auditLog({
        type: 'APPROVAL_EXPIRED',
        action: `${request.action} on ${request.resource}`,
        details: `Request ${requestId} expired before approval`
      });
      throw new Error(`Approval request ${requestId} has expired`);
    }

    // Update request
    request.status = approved ? 'APPROVED' : 'REJECTED';
    request.approved_by = approver;
    request.approval_timestamp = new Date().toISOString();
    request.approval_notes = notes;

    requests[requestIndex] = request;
    this.savePendingRequests(requests);

    this.auditLog({
      type: approved ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      action: `${request.action} on ${request.resource}`,
      details: `Approver: ${approver}, Notes: ${notes}`
    });

    return request;
  }

  listPendingRequests() {
    const requests = this.loadPendingRequests()
      .filter(r => r.status === 'PENDING')
      .filter(r => new Date() <= new Date(r.expires_at));

    return requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async interactiveApproval() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const pendingRequests = this.listPendingRequests();

    if (pendingRequests.length === 0) {
      console.log('✅ No pending approval requests');
      rl.close();
      return;
    }

    console.log(`\n📋 ${pendingRequests.length} Pending Approval Request(s):\n`);

    for (let i = 0; i < pendingRequests.length; i++) {
      const req = pendingRequests[i];
      const timeAgo = Math.round((Date.now() - new Date(req.timestamp)) / 1000 / 60);

      console.log(`${i + 1}. [${req.risk_level} RISK] ${req.action} on ${req.resource}`);
      console.log(`   🤖 AI Agent: ${req.aiAgent}`);
      console.log(`   📝 Justification: ${req.justification}`);
      console.log(`   ⏰ Requested: ${timeAgo} minutes ago`);
      console.log(`   🆔 ID: ${req.id}\n`);
    }

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    try {
      const selection = await question('Select request number to review (or "q" to quit): ');

      if (selection.toLowerCase() === 'q') {
        rl.close();
        return;
      }

      const requestIndex = parseInt(selection) - 1;
      if (requestIndex < 0 || requestIndex >= pendingRequests.length) {
        console.log('❌ Invalid selection');
        rl.close();
        return;
      }

      const selectedRequest = pendingRequests[requestIndex];
      console.log(`\n📋 Reviewing Request: ${selectedRequest.id}`);
      console.log(`🎯 Action: ${selectedRequest.action}`);
      console.log(`📂 Resource: ${selectedRequest.resource}`);
      console.log(`⚠️  Risk Level: ${selectedRequest.risk_level}`);
      console.log(`💭 Justification: ${selectedRequest.justification}`);

      const decision = await question('\nApprove this request? (y/n): ');
      const approver = await question('Your name/ID: ');
      const notes = await question('Notes (optional): ');

      const approved = decision.toLowerCase() === 'y';
      await this.processApprovalRequest(selectedRequest.id, approved, approver, notes);

      console.log(`\n${approved ? '✅ APPROVED' : '❌ REJECTED'}: Request ${selectedRequest.id}`);

      if (approved) {
        console.log('🤖 AI agent can now proceed with this action');
        console.log('⚠️  Ensure you monitor the execution carefully');
      } else {
        console.log('🚫 AI agent has been blocked from this action');
      }

    } finally {
      rl.close();
    }
  }

  generateSecurityReport() {
    const requests = this.loadPendingRequests();
    const now = new Date();

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING' && new Date(r.expires_at) > now).length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      expired: requests.filter(r => r.status === 'EXPIRED' || new Date(r.expires_at) <= now).length,
      highRisk: requests.filter(r => r.risk_level === 'HIGH').length,
      mediumRisk: requests.filter(r => r.risk_level === 'MEDIUM').length,
      lowRisk: requests.filter(r => r.risk_level === 'LOW').length
    };

    console.log('\n🛡️  AI SECURITY REPORT');
    console.log('========================');
    console.log(`📊 Total Requests: ${stats.total}`);
    console.log(`⏳ Pending: ${stats.pending}`);
    console.log(`✅ Approved: ${stats.approved}`);
    console.log(`❌ Rejected: ${stats.rejected}`);
    console.log(`⏰ Expired: ${stats.expired}`);
    console.log(`\n🚨 Risk Distribution:`);
    console.log(`   High Risk: ${stats.highRisk}`);
    console.log(`   Medium Risk: ${stats.mediumRisk}`);
    console.log(`   Low Risk: ${stats.lowRisk}`);

    return stats;
  }
}

// CLI Commands
const command = process.argv[2];

if (command === 'approve') {
  const workflow = new ApprovalWorkflow();
  workflow.interactiveApproval().catch(console.error);
} else if (command === 'list') {
  const workflow = new ApprovalWorkflow();
  const pending = workflow.listPendingRequests();
  console.log(`\n📋 ${pending.length} Pending Approval Requests:`);
  pending.forEach((req, i) => {
    console.log(`${i + 1}. [${req.risk_level}] ${req.action} on ${req.resource} (${req.id})`);
  });
} else if (command === 'report') {
  const workflow = new ApprovalWorkflow();
  workflow.generateSecurityReport();
} else if (command === 'check') {
  const [,, , action, resource] = process.argv;
  if (!action || !resource) {
    console.log('Usage: node approval-workflow.js check <action> <resource>');
    process.exit(1);
  }
  const workflow = new ApprovalWorkflow();
  const permissionSystem = new (require('./ai-permission-system'))();
  const result = permissionSystem.checkPermission(action, resource);
  console.log(result.reason);
  process.exit(result.allowed ? 0 : 1);
} else {
  console.log('TutorWise AI Approval Workflow');
  console.log('Commands:');
  console.log('  approve  - Interactive approval process');
  console.log('  list     - List pending requests');
  console.log('  report   - Generate security report');
  console.log('  check    - Check permission for action');
}

module.exports = ApprovalWorkflow;