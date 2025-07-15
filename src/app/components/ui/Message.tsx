import React from 'react';
import styles from './Message.module.css';

interface MessageProps {
  type: 'success' | 'error' | 'warning';
  children: React.ReactNode;
}

const Message = ({ type = 'success', children }: MessageProps) => {
  const messageClasses = `${styles.message} ${styles[type]}`;
  
  return <div className={messageClasses}>{children}</div>;
};

export default Message;