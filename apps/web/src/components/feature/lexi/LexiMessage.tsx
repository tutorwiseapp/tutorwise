'use client';

/**
 * Lexi Message Component
 *
 * Renders individual chat messages with appropriate styling
 * for user and assistant messages.
 *
 * @module components/feature/lexi/LexiMessage
 */

import { memo } from 'react';
import type { LexiMessage as LexiMessageType } from './useLexiChat';

// --- Types ---

interface LexiMessageProps {
  message: LexiMessageType;
  isLast?: boolean;
}

// --- Component ---

function LexiMessageComponent({ message, isLast: _isLast }: LexiMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Loading state
  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'rounded-br-md bg-teal-600 text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-900'
        }`}
      >
        {/* Message content */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>

        {/* Timestamp */}
        <div className={`mt-1 text-right text-xs ${isUser ? 'text-teal-100' : 'text-gray-400'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Memoize to prevent unnecessary re-renders
export const LexiMessage = memo(LexiMessageComponent);

export default LexiMessage;
