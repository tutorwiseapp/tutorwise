/**
 * Handler: rules.evaluate
 * In-process rules engine. Evaluates handler_config conditions against context values.
 *
 * Supported config shapes:
 *   { field: string, threshold: number }  — passes if context[field] >= threshold
 *   { field: string, min: number }        — passes if context[field] >= min
 *   { field: string, eq: unknown }        — passes if context[field] === eq
 *   { field: string, truthy: true }       — passes if context[field] is truthy
 *
 * Context outputs: { passed: boolean, reason: string }
 * Also stores _lastConditionPassed for WorkflowCompiler conditional routing.
 */

import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

export async function handleRulesEvaluate(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const config = opts.handlerConfig ?? {};
  const field = config.field as string | undefined;

  if (!field) {
    return { passed: true, reason: 'no field specified — defaulting to pass', _lastConditionPassed: true };
  }

  const value = context[field];
  let passed = false;
  let reason = '';

  if ('threshold' in config) {
    const threshold = config.threshold as number;
    passed = typeof value === 'number' && value >= threshold;
    reason = `${field}=${value} ${passed ? '>=' : '<'} threshold=${threshold}`;
  } else if ('min' in config) {
    const min = config.min as number;
    passed = typeof value === 'number' && value >= min;
    reason = `${field}=${value} ${passed ? '>=' : '<'} min=${min}`;
  } else if ('eq' in config) {
    passed = value === config.eq;
    reason = `${field}=${value} ${passed ? '===' : '!=='} ${config.eq}`;
  } else if (config.truthy) {
    passed = Boolean(value);
    reason = `${field} is ${passed ? 'truthy' : 'falsy'}`;
  } else {
    // Fallback: if the value exists and is > 0 or truthy
    passed = typeof value === 'number' ? value > 0 : Boolean(value);
    reason = `${field} evaluated as ${passed ? 'pass' : 'fail'}`;
  }

  return { passed, reason, _lastConditionPassed: passed };
}
