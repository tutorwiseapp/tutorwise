import React from 'react';
import styles from './Message.module.css';

// --- THIS IS THE FIX ---
// Added className to the props interface.
interface MessageProps {
  type: 'success' | 'error' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const Message = ({ type = 'success', children, className }: MessageProps) => {
  // --- THIS IS THE FIX ---
  // The passed className is now correctly applied.
  const messageClasses = `${styles.message} ${styles[type]} ${className || ''}`;
  
  return <div className={messageClasses}>{children}</div>;
};
export default Message;