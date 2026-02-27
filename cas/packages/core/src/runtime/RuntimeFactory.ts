/**
 * Runtime Factory
 *
 * Factory pattern for creating agent runtime instances.
 *
 * Usage:
 *   const runtime = AgentRuntimeFactory.create();
 *   await runtime.initialize();
 *
 * Environment Variables:
 *   CAS_RUNTIME=langgraph - Use LangGraphRuntime (default and only option)
 *
 * Note: CustomAgentRuntime was removed in Phase 8 (2026-02-27).
 * Recovery: git checkout custom-runtime-last-working
 */

import type { AgentRuntimeInterface, RuntimeType, RuntimeConfig } from './AgentRuntimeInterface';
import { LangGraphRuntime } from './LangGraphRuntime';

export class AgentRuntimeFactory {
  /**
   * Create an agent runtime instance
   *
   * @param type - RuntimeType (optional, defaults to env CAS_RUNTIME or 'langgraph')
   * @param config - Runtime configuration (optional)
   * @returns AgentRuntimeInterface implementation (LangGraphRuntime)
   */
  static create(type?: RuntimeType, config?: RuntimeConfig): AgentRuntimeInterface {
    // Determine runtime type from parameter or environment
    const runtimeType = type || (process.env.CAS_RUNTIME as RuntimeType) || 'langgraph';

    console.log(`[CAS Runtime Factory] Creating runtime: ${runtimeType}`);

    // Only LangGraph is supported (CustomRuntime removed in Phase 8)
    if (runtimeType !== 'langgraph') {
      throw new Error(
        `Invalid runtime type: ${runtimeType}. ` +
        `Only 'langgraph' is supported. ` +
        `CustomRuntime was removed in Phase 8 (2026-02-27). ` +
        `Recovery: git checkout custom-runtime-last-working`
      );
    }

    return new LangGraphRuntime(config);
  }

  /**
   * Get current runtime type from environment
   */
  static getCurrentRuntimeType(): RuntimeType {
    return (process.env.CAS_RUNTIME as RuntimeType) || 'langgraph';
  }

  /**
   * Check if a runtime type is available
   */
  static isRuntimeAvailable(type: RuntimeType): boolean {
    // Only LangGraph is available (CustomRuntime removed in Phase 8)
    return type === 'langgraph';
  }
}
