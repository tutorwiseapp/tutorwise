/**
 * Runtime Factory
 *
 * Factory pattern for creating agent runtime instances.
 * Enables runtime switching via CAS_RUNTIME environment variable.
 *
 * Usage:
 *   const runtime = AgentRuntimeFactory.create();
 *   await runtime.initialize();
 *
 * Environment Variables:
 *   CAS_RUNTIME=langgraph - Use LangGraphRuntime (default)
 *   CAS_RUNTIME=custom    - Use CustomAgentRuntime (fallback/legacy)
 */

import type { AgentRuntimeInterface, RuntimeType, RuntimeConfig } from './AgentRuntimeInterface';
import { CustomAgentRuntime } from './CustomRuntime';
import { LangGraphRuntime } from './LangGraphRuntime';

export class AgentRuntimeFactory {
  /**
   * Create an agent runtime instance based on type or environment variable
   *
   * @param type - RuntimeType (optional, defaults to env CAS_RUNTIME or 'langgraph')
   * @param config - Runtime configuration (optional)
   * @returns AgentRuntimeInterface implementation
   */
  static create(type?: RuntimeType, config?: RuntimeConfig): AgentRuntimeInterface {
    // Determine runtime type from parameter or environment
    const runtimeType = type || (process.env.CAS_RUNTIME as RuntimeType) || 'langgraph';

    console.log(`[CAS Runtime Factory] Creating runtime: ${runtimeType}`);

    switch (runtimeType) {
      case 'custom':
        return new CustomAgentRuntime(config);

      case 'langgraph':
        return new LangGraphRuntime(config);

      default:
        throw new Error(`Unknown runtime type: ${runtimeType}. Use 'custom' or 'langgraph'.`);
    }
  }

  /**
   * Get current runtime type from environment
   */
  static getCurrentRuntimeType(): RuntimeType {
    return (process.env.CAS_RUNTIME as RuntimeType) || 'custom';
  }

  /**
   * Check if a runtime type is available
   */
  static isRuntimeAvailable(type: RuntimeType): boolean {
    switch (type) {
      case 'custom':
        return true;
      case 'langgraph':
        return true; // ✅ Available as of Phase 5 completion
      default:
        return false;
    }
  }
}
