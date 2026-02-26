/**
 * CAS Runtime Module
 *
 * Exports:
 * - AgentRuntimeInterface: Core interface for all runtimes
 * - AgentRuntimeFactory: Factory for creating runtime instances
 * - CustomAgentRuntime: Current custom implementation
 * - RuntimeType: Enum for runtime types
 *
 * Usage:
 *   import { AgentRuntimeFactory } from '@cas/core/runtime';
 *
 *   const runtime = AgentRuntimeFactory.create();
 *   await runtime.initialize();
 */

export * from './AgentRuntimeInterface';
export * from './RuntimeFactory';
export * from './CustomRuntime';
export { AgentRuntimeFactory } from './RuntimeFactory';
