import { AIPermissionSystem } from '../../../../tools/rbac';

class PermissionedEngineer {
  private permissionSystem: AIPermissionSystem;

  constructor() {
    this.permissionSystem = new AIPermissionSystem();
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
      return true;
    }

    if (result.requires_approval) {
      console.log(`️⚠️ Action requires human approval: ${result.reason}`);
      this.permissionSystem.requestApproval(action, resource, justification, agentName);
      // In a real implementation, this would enter a loop to check for approval status.
      // For now, we will consider it denied.
      return false;
    }

    console.error(`🚫 Action forbidden: ${result.reason}`);
    return false;
  }
}

export const engineer = new PermissionedEngineer();
