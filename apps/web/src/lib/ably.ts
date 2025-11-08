/**
 * Filename: apps/web/src/lib/ably.ts
 * Purpose: Ably real-time client configuration and utilities
 * Created: 2025-11-08
 */

import * as Ably from 'ably';
import { ChatClient } from '@ably/chat';

// Server-side Ably client (uses API key)
export function getAblyServerClient(): Ably.Realtime {
  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not configured');
  }

  return new Ably.Realtime({
    key: apiKey,
    echoMessages: false,
  });
}

// Client-side Ably client (uses token auth for security)
export function getAblyClientClient(userId: string): Ably.Realtime {
  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not configured');
  }

  return new Ably.Realtime({
    key: apiKey,
    clientId: userId,
    echoMessages: false,
  });
}

// Chat client for messaging features
export async function getChatClient(userId: string): Promise<ChatClient> {
  const realtimeClient = getAblyClientClient(userId);

  const chatClient = new ChatClient(realtimeClient);

  return chatClient;
}

// Channel naming conventions
export const AblyChannels = {
  // Private 1:1 chat between two users (sorted IDs for consistency)
  privateChat: (userId1: string, userId2: string) => {
    const [id1, id2] = [userId1, userId2].sort();
    return `private-chat:${id1}:${id2}`;
  },

  // User's personal presence channel
  userPresence: (userId: string) => `presence:user:${userId}`,

  // Connection request notifications
  connectionNotifications: (userId: string) => `notifications:connections:${userId}`,

  // Network-wide updates (for stats, etc.)
  networkUpdates: (userId: string) => `network:updates:${userId}`,
};

// Message types for type safety
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileUrl?: string;
    imageUrl?: string;
  };
  timestamp: number;
  read: boolean;
}

// Presence data structure
export interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

// Typing event structure
export interface TypingEvent {
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: number;
}

// Message delivery status
export enum DeliveryStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}
