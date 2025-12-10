/**
 * Filename: ChatThread.tsx
 * Purpose: Chat thread component for Messages Hub
 * Created: 2025-11-24
 * Specification: Real-time chat thread with Ably subscriptions
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChatClient, ChatMessageEvent } from '@ably/chat';
import toast from 'react-hot-toast';
import { getChatClient, AblyChannels, MessageType, DeliveryStatus } from '@/lib/ably';
import { useAblyPresence } from '@/app/hooks/useAblyPresence';
import { useAblyTyping } from '@/app/hooks/useAblyTyping';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './ChatThread.module.css';

interface ChatThreadProps {
  currentUserId: string;
  otherUser: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  onBack?: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  content: string;
  timestamp: number;
  read: boolean;
  deliveryStatus?: DeliveryStatus;
}

export default function ChatThread({
  currentUserId,
  otherUser,
  onBack,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatClient, setChatClient] = useState<ChatClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<any>(null);

  // Track other user's presence status
  const { isOnline: isOtherUserOnline } = useAblyPresence(otherUser.id, currentUserId);

  // Track typing indicators
  const channelName = AblyChannels.privateChat(currentUserId, otherUser.id);
  const { isOtherUserTyping, startTyping, stopTyping } = useAblyTyping(
    channelName,
    currentUserId,
    'You'
  );

  // Initialize Ably Chat client
  useEffect(() => {
    let mounted = true;

    const initChat = async () => {
      try {
        const client = await getChatClient(currentUserId);
        if (mounted) {
          if (client) {
            setChatClient(client);
          } else {
            console.warn('[ChatThread] Ably Chat not configured - real-time features disabled');
          }
        }
      } catch (error) {
        console.error('[ChatThread] Failed to initialize chat:', error);
        toast.error('Failed to connect to chat');
      }
    };

    initChat();

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.detach();
      }
    };
  }, [currentUserId]);

  // Load conversation history and subscribe to real-time updates
  useEffect(() => {
    if (!otherUser || !chatClient) return;

    let mounted = true;

    const loadConversation = async () => {
      setIsLoading(true);
      try {
        // Load existing messages from database
        const response = await fetch(`/api/network/chat/${otherUser.id}`);
        if (!response.ok) throw new Error('Failed to load messages');
        const data = await response.json();

        if (mounted) {
          setMessages(data.messages || []);
        }

        // Subscribe to real-time channel
        const channelName = AblyChannels.privateChat(currentUserId, otherUser.id);
        const room = await chatClient.rooms.get(channelName);
        await room.attach();
        roomRef.current = room;

        // Subscribe to new messages
        await room.messages.subscribe((event: ChatMessageEvent) => {
          if (mounted) {
            const message = event.message;
            const newMessage: ChatMessage = {
              id: message.clientId || crypto.randomUUID(),
              senderId: message.clientId || '',
              receiverId: currentUserId,
              type: (message.metadata?.type as MessageType) || MessageType.TEXT,
              content: message.text || '',
              timestamp: message.timestamp.getTime(),
              read: false,
            };

            setMessages((prev) => [...prev, newMessage]);

            // Mark as read if user is viewing conversation
            markAsRead(newMessage.id);
          }
        });
      } catch (error) {
        console.error('[ChatThread] Error loading conversation:', error);
        toast.error('Failed to load messages');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadConversation();

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.detach();
        roomRef.current = null;
      }
    };
  }, [otherUser, chatClient, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAsRead = async (messageId: string) => {
    try {
      await fetch('/api/network/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
    } catch (error) {
      console.error('[ChatThread] Failed to mark message as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || !otherUser || !chatClient) return;

    // Stop typing indicator when sending
    stopTyping();

    const tempId = crypto.randomUUID();
    const messageContent = inputMessage.trim();
    setInputMessage('');

    // Add optimistic message with "sending" status
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: currentUserId,
      receiverId: otherUser.id,
      type: MessageType.TEXT,
      content: messageContent,
      timestamp: Date.now(),
      read: false,
      deliveryStatus: DeliveryStatus.SENDING,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      // Persist message to database first
      const response = await fetch('/api/network/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: otherUser.id,
          content: messageContent,
          type: MessageType.TEXT,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Update message with real ID and "sent" status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, id: data.message.id, deliveryStatus: DeliveryStatus.SENT }
            : msg
        )
      );

      // Publish to Ably channel for real-time delivery
      if (roomRef.current) {
        await roomRef.current.messages.send({
          text: messageContent,
          metadata: {
            type: MessageType.TEXT,
            messageId: data.message.id,
          },
        });

        // Update to "delivered" status
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message.id
              ? { ...msg, deliveryStatus: DeliveryStatus.DELIVERED }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('[ChatThread] Failed to send message:', error);
      toast.error('Failed to send message');

      // Update message to "failed" status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, deliveryStatus: DeliveryStatus.FAILED } : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // Handle input change to trigger typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Get avatar URL
  const avatarUrl = otherUser.avatar_url
    ? getProfileImageUrl({
        id: otherUser.id,
        avatar_url: otherUser.avatar_url,
        full_name: otherUser.full_name || undefined // Use other user name for initials
      })
    : null;

  return (
    <div className={styles.thread}>
      {/* Header */}
      <div className={styles.header}>
        {onBack && (
          <button onClick={onBack} className={styles.backButtonMobile}>
            ← Back
          </button>
        )}
        <Link href={`/public-profile/${otherUser.id}`} className={styles.headerLink}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={otherUser.full_name || 'User'}
              className={styles.headerAvatar}
              width={40}
              height={40}
            />
          ) : (
            <div className={styles.headerAvatarFallback}>
              {(otherUser.full_name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>{otherUser.full_name || 'Unknown User'}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {isLoading ? (
          <div className={styles.loading}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No messages yet</p>
            <p className={styles.emptySubtext}>Start the conversation!</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message) => {
              const isSent = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`${styles.message} ${
                    isSent ? styles.messageSent : styles.messageReceived
                  }`}
                >
                  <div className={styles.messageContent}>{message.content}</div>
                  <div className={styles.messageTimestamp}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {isSent && message.deliveryStatus && (
                      <span className={styles.deliveryStatus}>
                        {message.deliveryStatus === DeliveryStatus.SENDING && ' · Sending'}
                        {message.deliveryStatus === DeliveryStatus.SENT && ' · Sent'}
                        {message.deliveryStatus === DeliveryStatus.DELIVERED && ' · Delivered'}
                        {message.deliveryStatus === DeliveryStatus.READ && ' · Read'}
                        {message.deliveryStatus === DeliveryStatus.FAILED && ' · Failed'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {isOtherUserTyping && (
              <div className={styles.typingIndicator}>
                <span className={styles.typingDot}></span>
                <span className={styles.typingDot}></span>
                <span className={styles.typingDot}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className={styles.inputForm}>
        <input
          type="text"
          value={inputMessage}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className={styles.input}
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isSending}
          className={styles.sendButton}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
