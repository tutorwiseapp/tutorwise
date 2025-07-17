import React from 'react';
import styles from './ContentBox.module.css';

interface ContentBoxProps {
  children: React.ReactNode;
  className?: string;
}

const ContentBox = ({ children, className }: ContentBoxProps) => {
  return (
    <div className={`${styles.box} ${className || ''}`}>
      {children}
    </div>
  );
};

export default ContentBox;