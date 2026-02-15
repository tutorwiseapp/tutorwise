/**
 * Lexi Components
 *
 * Exports all Lexi chat UI components for use throughout the app.
 *
 * @module components/feature/lexi
 */

// Main chat component
export { default as LexiChat, LexiChat as LexiChatComponent } from './LexiChat';

// Floating modal component
export { default as LexiChatModal, LexiChatModal as LexiChatModalComponent } from './LexiChatModal';

// Message component
export { default as LexiMessage, LexiMessage as LexiMessageComponent } from './LexiMessage';

// Markdown renderer
export { default as LexiMarkdown, LexiMarkdown as LexiMarkdownComponent } from './LexiMarkdown';

// History component
export { default as LexiHistory, LexiHistory as LexiHistoryComponent } from './LexiHistory';

// Error boundary
export { default as LexiErrorBoundary, LexiErrorBoundary as LexiErrorBoundaryComponent } from './LexiErrorBoundary';

// Sage handoff component
export {
  default as SageHandoff,
  SageHandoff as SageHandoffComponent,
  detectEducationalIntent,
} from './SageHandoff';

// Chat hook
export {
  useLexiChat,
  type LexiMessage as LexiMessageType,
  type LexiSession,
  type UseLexiChatOptions,
  type UseLexiChatReturn,
} from './useLexiChat';

// History hook
export {
  useLexiHistory,
  type LexiConversation,
  type LexiHistoryMessage,
  type ConversationWithMessages,
  type UseLexiHistoryOptions,
  type UseLexiHistoryReturn,
} from './useLexiHistory';
