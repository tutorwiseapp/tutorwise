#!/usr/bin/env node

/**
 * TutorWise AI Approval Workflow System
 * Manages human approval process for sensitive AI actions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import AIPermissionSystem from './ai-permission-system';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ApprovalRequest {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  justification: string;
  aiAgent: string;
  status: ApprovalStatus;
  created_by: string;
  approved_by: string | null;
  approval_timestamp: string | null;
  expires_at: string;
  risk_level: RiskLevel;
  approval_notes?: string;
}

interface AuditEntry {
  type: string;
  action: string;
  details: string;
}

export default class ApprovalWorkflow {
  private approvalFile: string;
  private auditFile: string;

  constructor() {
    this.approvalFile = path.join(process.cwd(), 'logs/approval-requests.json');
    this.auditFile = path.join(process.cwd(), 'logs/approval-audit.log');
    this.ensureLogDirs();
  }

  private ensureLogDirs(): void {
    const logDir = path.dirname(this.approvalFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private loadPendingRequests(): ApprovalRequest[] {
    try {
      if (!fs.existsSync(this.approvalFile)) return [];
      const data = fs.readFileSync(this.approvalFile, 'utf8');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading approval requests:', error);
      return [];
    }
  }

  private savePendingRequests(requests: ApprovalRequest[]): void {
    fs.writeFileSync(this.approvalFile, JSON.stringify(requests, null, 2));
  }

  private auditLog(entry: AuditEntry): void {
    const logEntry = `${new Date().toISOString()} [${entry.type}] ${entry.action} - ${entry.details}\n`;
    fs.appendFileSync(this.auditFile, logEntry);
  }

  createApprovalRequest(action: string, resource: string, justification: string, aiAgent = 'cas-agent'): ApprovalRequest {
    const request: ApprovalRequest = {
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
      risk_level: this.assessRiskLevel(action, resource),
    };

    const requests = this.loadPendingRequests();
    requests.push(request);
    this.savePendingRequests(requests);

    this.auditLog({
      type: 'APPROVAL_REQUESTED',
      action: `${action} on ${resource}`,
      details: `AI agent ${aiAgent} requested approval: ${justification}`,
    });

    return request;
  }

  private assessRiskLevel(action: string, resource: string): RiskLevel {
    const highRisk = ['PRODUCTION', 'DATABASE', 'SECRET', 'KEY', 'PASSWORD', 'DEPLOY'];
    const mediumRisk = ['STAGING', 'API', 'MIDDLEWARE', 'AUTH'];
    const upperAction = action.toUpperCase();
    const upperResource = resource.toUpperCase();

    if (highRisk.some(p => upperAction.includes(p) || upperResource.includes(p))) return 'HIGH';
    if (mediumRisk.some(p => upperAction.includes(p) || upperResource.includes(p))) return 'MEDIUM';
    return 'LOW';
  }

  async processApprovalRequest(requestId: string, approved: boolean, approver: string, notes = ''): Promise<ApprovalRequest> {
    const requests = this.loadPendingRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);

    if (requestIndex === -1) throw new Error(`Approval request ${requestId} not found`);

    const request = requests[requestIndex];

    if (new Date() > new Date(request.expires_at)) {
      request.status = 'EXPIRED';
      this.auditLog({ type: 'APPROVAL_EXPIRED', action: `${request.action} on ${request.resource}`, details: `Request ${requestId} expired` });
      this.savePendingRequests(requests);
      throw new Error(`Approval request ${requestId} has expired`);
    }

    request.status = approved ? 'APPROVED' : 'REJECTED';
    request.approved_by = approver;
    request.approval_timestamp = new Date().toISOString();
    request.approval_notes = notes;

    this.savePendingRequests(requests);
    this.auditLog({ type: approved ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED', action: `${request.action} on ${request.resource}`, details: `Approver: ${approver}, Notes: ${notes}` });

    return request;
  }

  listPendingRequests(): ApprovalRequest[] {
    return this.loadPendingRequests()
      .filter(r => r.status === 'PENDING' && new Date() <= new Date(r.expires_at))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}


// CLI Commands are now handled externally
// (This space intentionally left blank)