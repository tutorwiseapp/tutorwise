/**
 * CAS Capability Manifest Loader
 *
 * Loads and validates capability manifests for Lexi, Sage, and CAS agents.
 * Used for A2A discovery and tool registration.
 *
 * @module cas/capabilities
 *
 * @example
 * ```typescript
 * import { loadCapabilities, discoverAgents } from '@cas/capabilities';
 *
 * // Load all capabilities
 * const capabilities = await loadCapabilities();
 *
 * // Discover agents with specific capability
 * const agents = discoverAgents('homework_help');
 * ```
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

// --- Types ---

export interface CapabilityManifest {
  $schema?: string;
  name: string;
  version: string;
  agent: 'lexi' | 'sage' | 'cas';
  persona?: string;
  description?: string;
  capabilities: Capability[];
  intents?: Intent[];
  tools?: ToolConfig;
  constraints?: Constraints;
}

export interface Capability {
  id: string;
  name: string;
  description?: string;
  operations: string[];
}

export interface Intent {
  category: string;
  actions: string[];
  examples?: string[];
}

export interface ToolConfig {
  supported: boolean;
  format: 'openai_compatible' | 'anthropic' | 'custom';
  functions?: string[];
}

export interface Constraints {
  allowedRoles?: string[];
  rateLimit?: {
    requests_per_minute: number;
    tokens_per_minute: number;
  };
  dataAccess?: Record<string, boolean>;
  contentFiltering?: {
    enabled: boolean;
    level: 'strict' | 'moderate' | 'minimal';
  };
}

export interface AgentDiscoveryResult {
  agent: string;
  persona?: string;
  capabilities: string[];
  operations: string[];
  manifest: CapabilityManifest;
}

// --- State ---

const manifestCache: Map<string, CapabilityManifest> = new Map();
const capabilityIndex: Map<string, AgentDiscoveryResult[]> = new Map();

// --- Core Functions ---

/**
 * Get the root directory for manifests.
 */
function getManifestRoot(): string {
  return join(dirname(__dirname), '..');
}

/**
 * Load a capability manifest from a JSON file.
 */
export function loadManifest(manifestPath: string): CapabilityManifest | null {
  if (manifestCache.has(manifestPath)) {
    return manifestCache.get(manifestPath)!;
  }

  if (!existsSync(manifestPath)) {
    console.warn(`[Capabilities] Manifest not found: ${manifestPath}`);
    return null;
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as CapabilityManifest;

    // Validate basic structure
    if (!manifest.name || !manifest.version || !manifest.agent || !manifest.capabilities) {
      console.error(`[Capabilities] Invalid manifest structure: ${manifestPath}`);
      return null;
    }

    manifestCache.set(manifestPath, manifest);
    return manifest;
  } catch (error) {
    console.error(`[Capabilities] Failed to load manifest: ${manifestPath}`, error);
    return null;
  }
}

/**
 * Load all capability manifests for an agent.
 */
export function loadAgentCapabilities(
  agent: 'lexi' | 'sage'
): Map<string, CapabilityManifest> {
  const manifests = new Map<string, CapabilityManifest>();
  const root = getManifestRoot();
  const personasDir = join(root, agent, 'personas');

  if (!existsSync(personasDir)) {
    console.warn(`[Capabilities] Personas directory not found: ${personasDir}`);
    return manifests;
  }

  try {
    const personas = readdirSync(personasDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const persona of personas) {
      const manifestPath = join(personasDir, persona, 'capabilities.json');
      const manifest = loadManifest(manifestPath);
      if (manifest) {
        manifests.set(`${agent}:${persona}`, manifest);
      }
    }
  } catch (error) {
    console.error(`[Capabilities] Failed to load agent capabilities: ${agent}`, error);
  }

  return manifests;
}

/**
 * Load all capabilities from all agents.
 */
export function loadAllCapabilities(): Map<string, CapabilityManifest> {
  const allManifests = new Map<string, CapabilityManifest>();

  // Load Lexi personas
  const lexiManifests = loadAgentCapabilities('lexi');
  for (const [key, manifest] of lexiManifests) {
    allManifests.set(key, manifest);
  }

  // Load Sage personas (when available)
  const sageManifests = loadAgentCapabilities('sage');
  for (const [key, manifest] of sageManifests) {
    allManifests.set(key, manifest);
  }

  // Build capability index
  buildCapabilityIndex(allManifests);

  return allManifests;
}

/**
 * Build an index of capabilities for discovery.
 */
function buildCapabilityIndex(manifests: Map<string, CapabilityManifest>): void {
  capabilityIndex.clear();

  for (const [key, manifest] of manifests) {
    for (const capability of manifest.capabilities) {
      const capId = capability.id;

      if (!capabilityIndex.has(capId)) {
        capabilityIndex.set(capId, []);
      }

      capabilityIndex.get(capId)!.push({
        agent: manifest.agent,
        persona: manifest.persona,
        capabilities: manifest.capabilities.map(c => c.id),
        operations: capability.operations,
        manifest,
      });

      // Also index by operations
      for (const op of capability.operations) {
        const opKey = `op:${op}`;
        if (!capabilityIndex.has(opKey)) {
          capabilityIndex.set(opKey, []);
        }
        capabilityIndex.get(opKey)!.push({
          agent: manifest.agent,
          persona: manifest.persona,
          capabilities: [capId],
          operations: [op],
          manifest,
        });
      }
    }
  }
}

/**
 * Discover agents that have a specific capability.
 */
export function discoverAgents(capability: string): AgentDiscoveryResult[] {
  // Ensure index is built
  if (capabilityIndex.size === 0) {
    loadAllCapabilities();
  }

  return capabilityIndex.get(capability) || [];
}

/**
 * Discover agents that can perform a specific operation.
 */
export function discoverByOperation(operation: string): AgentDiscoveryResult[] {
  if (capabilityIndex.size === 0) {
    loadAllCapabilities();
  }

  return capabilityIndex.get(`op:${operation}`) || [];
}

/**
 * Get all capabilities available for a user role.
 */
export function getCapabilitiesForRole(role: string): Map<string, CapabilityManifest> {
  const manifests = loadAllCapabilities();
  const filtered = new Map<string, CapabilityManifest>();

  for (const [key, manifest] of manifests) {
    const allowedRoles = manifest.constraints?.allowedRoles || [];
    if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
      filtered.set(key, manifest);
    }
  }

  return filtered;
}

/**
 * Get all available operations across all agents.
 */
export function getAllOperations(): string[] {
  if (capabilityIndex.size === 0) {
    loadAllCapabilities();
  }

  const operations = new Set<string>();
  for (const key of capabilityIndex.keys()) {
    if (key.startsWith('op:')) {
      operations.add(key.slice(3));
    }
  }

  return Array.from(operations);
}

/**
 * Clear the manifest cache.
 */
export function clearCache(): void {
  manifestCache.clear();
  capabilityIndex.clear();
}

/**
 * Get capability manifest for a specific agent/persona.
 */
export function getManifest(
  agent: string,
  persona?: string
): CapabilityManifest | null {
  const key = persona ? `${agent}:${persona}` : agent;

  if (capabilityIndex.size === 0) {
    loadAllCapabilities();
  }

  const cached = manifestCache.get(key);
  if (cached) return cached;

  // Try to load from standard path
  const root = getManifestRoot();
  const manifestPath = persona
    ? join(root, agent, 'personas', persona, 'capabilities.json')
    : join(root, agent, 'capabilities.json');

  return loadManifest(manifestPath);
}

/**
 * Validate a manifest against the schema.
 */
export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }

  const m = manifest as Record<string, unknown>;

  // Required fields
  if (!m.name) errors.push('Missing required field: name');
  if (!m.version) errors.push('Missing required field: version');
  if (!m.agent) errors.push('Missing required field: agent');
  if (!m.capabilities || !Array.isArray(m.capabilities)) {
    errors.push('Missing required field: capabilities (must be array)');
  }

  // Validate version format
  if (m.version && typeof m.version === 'string') {
    if (!/^\d+\.\d+\.\d+$/.test(m.version)) {
      errors.push('Version must be semantic version format (x.y.z)');
    }
  }

  // Validate agent
  if (m.agent && !['lexi', 'sage', 'cas'].includes(m.agent as string)) {
    errors.push('Agent must be one of: lexi, sage, cas');
  }

  // Validate capabilities
  if (Array.isArray(m.capabilities)) {
    for (let i = 0; i < m.capabilities.length; i++) {
      const cap = m.capabilities[i] as Record<string, unknown>;
      if (!cap.id) errors.push(`Capability ${i}: missing id`);
      if (!cap.name) errors.push(`Capability ${i}: missing name`);
      if (!cap.operations || !Array.isArray(cap.operations)) {
        errors.push(`Capability ${i}: missing operations array`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
