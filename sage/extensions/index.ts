/**
 * Sage Extensions
 *
 * Future role-specific overrides and customizations.
 *
 * This module is reserved for:
 * - Custom DSPy signatures per role
 * - Role-specific tool implementations
 * - Organization-level customizations
 * - A2A protocol extensions
 *
 * @module sage/extensions
 */

// --- Extension Types ---

export interface SageExtension {
  id: string;
  name: string;
  version: string;
  persona?: string;  // If role-specific
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface ExtensionRegistry {
  extensions: Map<string, SageExtension>;
  register(extension: SageExtension): void;
  get(id: string): SageExtension | undefined;
  list(): SageExtension[];
  enable(id: string): void;
  disable(id: string): void;
}

// --- Extension Registry Implementation ---

class ExtensionRegistryImpl implements ExtensionRegistry {
  extensions: Map<string, SageExtension> = new Map();

  register(extension: SageExtension): void {
    this.extensions.set(extension.id, extension);
    console.log(`[Extensions] Registered: ${extension.name} v${extension.version}`);
  }

  get(id: string): SageExtension | undefined {
    return this.extensions.get(id);
  }

  list(): SageExtension[] {
    return Array.from(this.extensions.values());
  }

  enable(id: string): void {
    const ext = this.extensions.get(id);
    if (ext) {
      ext.enabled = true;
    }
  }

  disable(id: string): void {
    const ext = this.extensions.get(id);
    if (ext) {
      ext.enabled = false;
    }
  }
}

export const extensionRegistry = new ExtensionRegistryImpl();

// --- Placeholder Extensions ---

// These will be implemented as needed:

// export { CustomDSPySignatures } from './dspy-signatures';
// export { OrganizationThemes } from './org-themes';
// export { A2AProtocolAdapter } from './a2a-adapter';
// export { MCPToolProvider } from './mcp-tools';
