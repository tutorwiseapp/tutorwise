/**
 * Sage Safety Module
 *
 * Barrel export for the safety pipeline.
 *
 * @module sage/safety
 */

export type {
  SafetyCategory,
  InputClassification,
  OutputValidation,
  OutputViolationType,
  WellbeingAlert,
  WellbeingSeverity,
  WellbeingCategory,
  AgeBracket,
  AgeAdaptation,
  SafeguardingEvent,
  SafetyPipelineResult,
} from './types';

export {
  classifyInput,
  stripPII,
  getBlockMessage,
} from './input-classifier';

export {
  validateOutput,
  stripOutputPII,
  isOffTopic,
} from './output-validator';

export {
  detectWellbeing,
  shouldBlockTutoring,
  shouldSwitchToSupportive,
} from './wellbeing-detector';

export {
  getAgeBracket,
  getAgeAdaptation,
  getAgeSystemPrompt,
  isTopicForbidden,
} from './age-adapter';
