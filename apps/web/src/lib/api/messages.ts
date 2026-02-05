/**
 * Messages API utilities
 * Handles conversation fetching and management
 */

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    timestamp: number;
    read: boolean;
  } | null;
  unreadCount: number;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch('/api/messages/conversations');

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  const data = await response.json();
  return data.conversations || [];
}

/**
 * Mark a conversation as read
 */
export async function markConversationRead(userId: string): Promise<void> {
  const response = await fetch('/api/messages/mark-conversation-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark conversation as read');
  }
}
