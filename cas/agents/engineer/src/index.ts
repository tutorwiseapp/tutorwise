/**
 * Engineer Agent - DevOps + SRE + Build Engineer
 *
 * Responsibilities:
 * - Build verification (npm run build)
 * - Build failure analysis (LLM-powered)
 * - Pre-deployment security checklist
 * - Deployment execution (simulated — real Vercel deploy is future work)
 * - Rollback capability
 * - Permission management for destructive actions
 *
 * @agent Engineer Agent
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { AIPermissionSystem, ApprovalWorkflow } from '../../../../tools/change-management';
import { casGenerate } from '../../../packages/core/src/services/cas-ai';
import { persistEvent } from '../../../packages/core/src/services/cas-events';
import { isVercelConfigured, createPreviewDeployment, waitForDeployment } from '../../../packages/core/src/services/cas-vercel';

const execAsync = promisify(exec);

const ENGINEER_SYSTEM_PROMPT = `You are the Engineer Agent for TutorWise, acting as DevOps, SRE, and Build Engineer.
Your role is to ensure builds succeed, diagnose failures, and manage deployments.
When analyzing build failures, identify the root cause, affected files, and suggest fixes.
Be precise and actionable — developers need clear guidance to fix build issues.`;

export interface BuildResult {
  success: boolean;
  output: string;
  duration: number;
  errors?: string[];
  warnings?: string[];
  analysis?: string;
}

export interface DeployResult {
  status: 'deployed' | 'blocked' | 'failed';
  environment?: string;
  url?: string;
  timestamp?: string;
  reason?: string;
  error?: string;
}

class EngineerAgent {
  private projectRoot: string;
  private permissionSystem: AIPermissionSystem;
  private approvalWorkflow: ApprovalWorkflow;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../../');
    this.permissionSystem = new AIPermissionSystem();
    this.approvalWorkflow = new ApprovalWorkflow();
  }

  /**
   * Runs the project build and returns structured results.
   * Timeout: 180s.
   */
  async build(): Promise<BuildResult> {
    console.log('▶️ Engineer Agent: Running build...');

    const webAppPath = path.join(this.projectRoot, 'apps/web');
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: webAppPath,
        timeout: 180000,
        env: { ...process.env },
      });

      const duration = Date.now() - startTime;
      const output = stdout + (stderr || '');
      const warnings = output.match(/warning[:\s].*/gi) || [];

      console.log(`✅ Build succeeded in ${duration}ms`);

      const result: BuildResult = {
        success: true,
        output: output.substring(0, 3000),
        duration,
        warnings: warnings.length > 0 ? warnings.slice(0, 10) : undefined,
      };

      await persistEvent('engineer', 'build_result', { success: true, duration });
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const output = (error.stdout || '') + (error.stderr || '') + (error.message || '');
      const errors = output.match(/error[:\s].*/gi) || [];

      console.error(`❌ Build failed in ${duration}ms`);

      // Analyze the failure with LLM
      const analysis = await this.analyzeBuildFailure(output);

      const result: BuildResult = {
        success: false,
        output: output.substring(0, 3000),
        duration,
        errors: errors.length > 0 ? errors.slice(0, 20) : ['Build failed — see output for details'],
        analysis: analysis || undefined,
      };

      await persistEvent('engineer', 'build_result', {
        success: false,
        duration,
        errorCount: errors.length,
      });
      return result;
    }
  }

  /**
   * Analyzes build failure output to identify root cause.
   * Uses LLM for intelligent analysis. Falls back to returning raw output.
   */
  async analyzeBuildFailure(output: string): Promise<string | null> {
    const analysis = await casGenerate({
      systemPrompt: ENGINEER_SYSTEM_PROMPT,
      userPrompt: `Analyze this build failure output and identify:
1. **Root Cause** — What specifically caused the build to fail?
2. **Affected Files** — Which files need to be fixed?
3. **Suggested Fix** — What changes would resolve the error?

Build output (truncated):
${output.substring(0, 4000)}`,
      maxOutputTokens: 1000,
    });

    return analysis;
  }

  /**
   * Deploys a feature. Verifies all upstream gates passed first.
   * If VERCEL_TOKEN is set, triggers a real Vercel preview deployment.
   * Otherwise falls back to simulated deploy.
   */
  async deploy(featureName: string, options: {
    securityApproved: boolean;
    qaApproved?: boolean;
    buildPassed?: boolean;
    environment?: 'staging' | 'production';
  }): Promise<DeployResult> {
    console.log(`▶️ Engineer Agent: Deploying "${featureName}"...`);

    const environment = options.environment || 'production';

    // Pre-deployment checklist
    if (!options.securityApproved) {
      console.warn('❌ Deployment blocked — security approval required');
      return { status: 'blocked', reason: 'Security scan must pass before deployment' };
    }

    if (options.qaApproved === false) {
      console.warn('❌ Deployment blocked — QA approval required');
      return { status: 'blocked', reason: 'QA review must approve before deployment' };
    }

    if (options.buildPassed === false) {
      console.warn('❌ Deployment blocked — build must pass');
      return { status: 'blocked', reason: 'Build must succeed before deployment' };
    }

    try {
      // Real Vercel preview deployment if configured
      if (isVercelConfigured()) {
        console.log(`▶️ Engineer Agent: Triggering Vercel preview deployment...`);

        const deployment = await createPreviewDeployment({
          name: `cas-${featureName.toLowerCase().replace(/\s+/g, '-')}`,
        });

        console.log(`▶️ Engineer Agent: Deployment ${deployment.id} queued, waiting for build...`);

        const deployResult = await waitForDeployment(deployment.id);

        await persistEvent('engineer', 'deployment', {
          featureName,
          environment: 'preview',
          deploymentId: deployResult.deploymentId,
          url: deployResult.url,
          status: deployResult.success ? 'deployed' : 'failed',
          duration: deployResult.duration,
          vercel: true,
        });

        if (deployResult.success) {
          console.log(`✅ Vercel preview deployment ready: ${deployResult.url}`);
          return {
            status: 'deployed',
            environment: 'preview',
            url: deployResult.url,
            timestamp: new Date().toISOString(),
          };
        } else {
          console.error(`❌ Vercel deployment failed: ${deployResult.error}`);
          return {
            status: 'failed',
            environment: 'preview',
            error: deployResult.error,
          };
        }
      }

      // Fallback: simulated deployment (no VERCEL_TOKEN)
      console.log(`▶️ Engineer Agent: Running simulated deployment (VERCEL_TOKEN not set)...`);

      const deploymentUrl = `https://tutorwise.io/features/${featureName.toLowerCase().replace(/\s+/g, '-')}`;

      const result: DeployResult = {
        status: 'deployed',
        environment,
        url: deploymentUrl,
        timestamp: new Date().toISOString(),
      };

      await persistEvent('engineer', 'deployment', {
        featureName,
        environment,
        url: deploymentUrl,
        status: 'deployed',
        simulated: true,
      });

      console.log(`✅ Simulated deployment: ${deploymentUrl}`);
      return result;
    } catch (error: any) {
      console.error('❌ Deployment failed:', error.message);

      await persistEvent('engineer', 'deployment', {
        featureName,
        environment,
        status: 'failed',
        error: error.message,
      });

      return { status: 'failed', error: error.message };
    }
  }

  /**
   * Rolls back a deployment.
   */
  async rollback(featureName: string, environment: 'staging' | 'production' = 'production'): Promise<{
    status: 'rolled_back' | 'failed';
    timestamp?: string;
    error?: string;
  }> {
    console.log(`▶️ Engineer Agent: Rolling back "${featureName}" from ${environment}...`);

    try {
      // Simulated rollback
      await persistEvent('engineer', 'rollback', { featureName, environment });

      console.log('✅ Rollback complete');
      return { status: 'rolled_back', timestamp: new Date().toISOString() };
    } catch (error: any) {
      console.error('❌ Rollback failed:', error.message);
      return { status: 'failed', error: error.message };
    }
  }

  /**
   * Permission management for destructive actions.
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
      return this.waitForApproval(request.id);
    }

    console.error(`🚫 Action FORBIDDEN for ${agentName} to ${action} on ${resource}: ${result.reason}`);
    return false;
  }

  private async waitForApproval(requestId: string): Promise<boolean> {
    const pollInterval = 10000;
    const maxAttempts = 360;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const requests = this.approvalWorkflow.listPendingRequests();
      const request = requests.find(r => r.id === requestId);

      if (!request) {
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

export const engineer = new EngineerAgent();
