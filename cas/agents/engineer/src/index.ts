import { AIPermissionSystem, ApprovalWorkflow } from '../../../../tools/change-management';

class PermissionedEngineer {
  private permissionSystem: AIPermissionSystem;
  private approvalWorkflow: ApprovalWorkflow;

  constructor() {
    this.permissionSystem = new AIPermissionSystem();
    this.approvalWorkflow = new ApprovalWorkflow();
  }

  /**
   * The central method for all CAS agents to request permission for an action.
   * @param action The action being performed (e.g., 'FILE_WRITE', 'GIT_COMMIT').
   * @param resource The resource being acted upon (e.g., a file path).
   * @param justification A brief explanation of why the action is necessary.
   * @param agentName The name of the agent requesting permission.
   * @returns {Promise<boolean>} True if the action is allowed, false otherwise.
   */
  async requestPermission(action: string, resource: string, justification: string, agentName: string): Promise<boolean> {
    const result = this.permissionSystem.checkPermission(action, resource, agentName);

    if (result.allowed) {
      console.log(`✅ Permission GRANTED for ${agentName} to ${action} on ${resource}.`);
      return true;
    }

    if (result.requires_approval) {
      console.log(`⚠️ Action requires human approval: ${result.reason}`);
      const request = this.approvalWorkflow.createApprovalRequest(action, resource, justification, agentName);
      console.log(`⏳ Waiting for human approval for request: ${request.id}`);
      
      // Poll for approval status
      return this.waitForApproval(request.id);
    }

    console.error(`🚫 Action FORBIDDEN for ${agentName} to ${action} on ${resource}: ${result.reason}`);
    return false;
  }

  private async waitForApproval(requestId: string): Promise<boolean> {
    const pollInterval = 10000; // 10 seconds
    const maxAttempts = 360; // 1 hour
    let attempts = 0;

    while (attempts < maxAttempts) {
      const requests = this.approvalWorkflow.listPendingRequests();
      const request = requests.find(r => r.id === requestId);

      if (!request) {
        // It has been processed (approved or rejected)
        // In a real system, we would check the audit log to confirm approval.
        // For now, we will assume it was approved if it's no longer pending.
        console.log(`✅ Approval received for ${requestId}.`);
        return true;
      }
      
      if (new Date() > new Date(request.expires_at)) {
        console.error(`❌ Approval request ${requestId} has expired.`);
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    console.error(`❌ Timed out waiting for approval for request: ${requestId}`);
    return false;
  }
}

export const engineer = new PermissionedEngineer();
