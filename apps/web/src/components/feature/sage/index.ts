/**
 * Sage AI Tutor Components
 *
 * UI components for the Sage tutoring feature.
 *
 * @module components/feature/sage
 */

export { default as SageChat } from './SageChat';
export { SageChat as LegacySageChat } from './SageChat';
export { default as SageMarkdown } from './SageMarkdown';
export { SageQuotaDisplay, type QuotaInfo } from './SageQuotaDisplay';
export { SageProUpgradeModal } from './SageProUpgradeModal';
export {
  useSageChat,
  type SageMessage,
  type SageSession,
  type UseSageChatOptions,
  type UseSageChatReturn,
  type SageSubject,
  type SageLevel,
  type SessionGoal,
} from './useSageChat';
