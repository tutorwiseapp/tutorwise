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
 *   CAS_RUNTIME=custom    - Use CustomAgentRuntime (default)
 *   CAS_RUNTIME=langgraph - Use LangGraphAgentRuntime
 */

import type { AgentRuntimeInterface, RuntimeType, RuntimeConfig } from './AgentRuntimeInterface';
import { CustomAgentRuntime } from './CustomRuntime';
// import { LangGraphAgentRuntime } from './LangGraphRuntime'; // Uncomment in Phase 3

export class AgentRuntimeFactory {
  /**
   * Create an agent runtime instance based on type or environment variable
   *
   * @param type - RuntimeType (optional, defaults to env CAS_RUNTIME or 'custom')
   * @param config - Runtime configuration (optional)
   * @returns AgentRuntimeInterface implementation
   */
  static create(type?: RuntimeType, config?: RuntimeConfig): AgentRuntimeInterface {
    // Determine runtime type from parameter or environment
    const runtimeType = type || (process.env.CAS_RUNTIME as RuntimeType) || 'custom';

    console.log(`[CAS Runtime Factory] Creating runtime: ${runtimeType}`);

    switch (runtimeType) {
      case 'custom':
        return new CustomAgentRuntime(config);

      case 'langgraph':
        // Phase 3: Uncomment when LangGraph runtime is implemented
        // return new LangGraphAgentRuntime(config);
        throw new Error(
          'LangGraph runtime not yet implemented. Set CAS_RUNTIME=custom or leave unset.'
        );

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
        return false; // Will be true in Phase 3
      default:
        return false;
    }
  }
}
