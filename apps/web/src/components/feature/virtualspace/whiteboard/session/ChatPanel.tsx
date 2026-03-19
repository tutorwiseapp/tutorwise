/**
 * ChatPanel
 * Ephemeral Ably-backed real-time chat overlay for the virtual whiteboard session.
 * Rendered inside InFrontOfTheCanvas so it floats over the tldraw canvas.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { useSession } from './SessionContext';

export function ChatPanel({ displayName }: { displayName: string }) {
  const { chatOpen, setChatOpen, chatMessages, sendChat } = useSession();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input when panel opens
  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    sendChat(text, displayName);
    setInput('');
  }, [input, sendChat, displayName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!chatOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        right: 16,
        width: 300,
        height: 420,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        border: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 500,
        overflow: 'hidden',
        pointerEvents: 'all',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#1e293b',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Session Chat</span>
        <button
          onClick={() => setChatOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 2,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {chatMessages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: 12,
              fontStyle: 'italic',
            }}
          >
            No messages yet. Say hi!
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isOwn = msg.displayName === displayName;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: '#64748b',
                    marginBottom: 2,
                    paddingLeft: isOwn ? 0 : 2,
                    paddingRight: isOwn ? 2 : 0,
                  }}
                >
                  {isOwn ? 'You' : msg.displayName}
                </div>
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '6px 10px',
                    borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isOwn ? '#2563eb' : '#f1f5f9',
                    color: isOwn ? 'white' : '#1e293b',
                    fontSize: 13,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderTop: '1px solid #f1f5f9',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'sans-serif',
            background: '#f8fafc',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: input.trim() ? '#2563eb' : '#e2e8f0',
            border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: input.trim() ? 'white' : '#94a3b8',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
