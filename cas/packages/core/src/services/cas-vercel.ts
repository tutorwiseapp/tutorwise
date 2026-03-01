/**
 * CAS Vercel API Client
 *
 * Provides programmatic access to Vercel deployment API for CAS engineer agent.
 * Triggers preview deployments (production remains via GitHub Actions).
 *
 * Env: VERCEL_TOKEN (required), VERCEL_ORG_ID, VERCEL_PROJECT_ID
 *
 * @see https://vercel.com/docs/rest-api/endpoints/deployments
 */

const VERCEL_API = 'https://api.vercel.com';

export interface VercelDeployment {
  id: string;
  url: string;
  state: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  readyState: string;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  error?: { code: string; message: string };
  meta?: Record<string, string>;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  url: string;
  state: string;
  duration: number;
  error?: string;
}

function getConfig() {
  const token = process.env.VERCEL_TOKEN;
  const orgId = process.env.VERCEL_ORG_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token) {
    return null;
  }

  return { token, orgId, projectId };
}

async function vercelFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  if (!config) throw new Error('VERCEL_TOKEN not configured');

  const url = `${VERCEL_API}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (config.orgId) {
    headers['x-vercel-team-id'] = config.orgId;
  }

  return fetch(url, { ...options, headers });
}

/**
 * Check if Vercel integration is available (VERCEL_TOKEN set)
 */
export function isVercelConfigured(): boolean {
  return !!process.env.VERCEL_TOKEN;
}

/**
 * Trigger a preview deployment via Vercel API.
 * Uses the project's git repository — Vercel builds from the latest commit.
 */
export async function createPreviewDeployment(options?: {
  ref?: string;
  name?: string;
}): Promise<VercelDeployment> {
  const config = getConfig();
  if (!config) throw new Error('VERCEL_TOKEN not configured');

  const body: Record<string, unknown> = {
    name: options?.name || 'tutorwise',
    target: null, // null = preview (not production)
    gitSource: {
      type: 'github',
      ref: options?.ref || 'main',
      repoId: config.projectId,
    },
  };

  // If projectId is set, use project-scoped deployment
  if (config.projectId) {
    body.project = config.projectId;
  }

  const response = await vercelFetch('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Vercel deployment failed: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get the status of a deployment by ID.
 */
export async function getDeploymentStatus(deploymentId: string): Promise<VercelDeployment> {
  const response = await vercelFetch(`/v13/deployments/${deploymentId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get deployment: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get the latest deployment for the project.
 */
export async function getLatestDeployment(): Promise<VercelDeployment | null> {
  const config = getConfig();
  if (!config) return null;

  const params = new URLSearchParams({ limit: '1' });
  if (config.projectId) {
    params.set('projectId', config.projectId);
  }

  const response = await vercelFetch(`/v6/deployments?${params}`);

  if (!response.ok) return null;

  const data = await response.json();
  return data.deployments?.[0] || null;
}

/**
 * Wait for a deployment to reach a terminal state (READY or ERROR).
 * Polls every 10 seconds, up to maxWaitMs (default 5 minutes).
 */
export async function waitForDeployment(
  deploymentId: string,
  maxWaitMs: number = 300000
): Promise<DeploymentResult> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const deployment = await getDeploymentStatus(deploymentId);

    if (deployment.state === 'READY') {
      return {
        success: true,
        deploymentId: deployment.id,
        url: `https://${deployment.url}`,
        state: deployment.state,
        duration: Date.now() - startTime,
      };
    }

    if (deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
      return {
        success: false,
        deploymentId: deployment.id,
        url: deployment.url ? `https://${deployment.url}` : '',
        state: deployment.state,
        duration: Date.now() - startTime,
        error: deployment.error?.message || `Deployment ${deployment.state.toLowerCase()}`,
      };
    }

    // Still building — wait and poll again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout
  return {
    success: false,
    deploymentId,
    url: '',
    state: 'TIMEOUT',
    duration: Date.now() - startTime,
    error: `Deployment timed out after ${maxWaitMs / 1000}s`,
  };
}
