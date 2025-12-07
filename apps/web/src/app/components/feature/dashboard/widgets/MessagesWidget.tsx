/**
 * Filename: MessagesWidget.tsx
 * Purpose: Actionable widget showing unread messages with quick access
 * Created: 2025-12-07
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import styles from './MessagesWidget.module.css';

interface Message {
  id: string;
  senderName: string;
  preview: string;
  timestamp: string;
  unread: boolean;
}

interface MessagesWidgetProps {
  unreadCount?: number;
  recentMessages?: Message[];
}

export default function MessagesWidget({
  unreadCount = 0,
  recentMessages = []
}: MessagesWidgetProps) {

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageSquare className={styles.icon} size={20} />
          <h3 className={styles.title}>Messages</h3>
        </div>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </div>

      <div className={styles.content}>
        {unreadCount === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>All caught up! No new messages.</p>
          </div>
        ) : (
          <>
            <p className={styles.description}>
              You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </p>

            {recentMessages.length > 0 && (
              <ul className={styles.messageList}>
                {recentMessages.slice(0, 3).map((message) => (
                  <li key={message.id} className={styles.messageItem}>
                    <div className={styles.messageSender}>{message.senderName}</div>
                    <div className={styles.messagePreview}>{message.preview}</div>
                    <div className={styles.messageTime}>{message.timestamp}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <Link href="/messages" className={styles.actionButton}>
          View All Messages
        </Link>
      </div>
    </div>
  );
}
