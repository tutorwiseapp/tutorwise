import React from 'react';
import styles from './Container.module.css';

// CORRECTED: Add className to props
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className }: ContainerProps) => {
  // CORRECTED: Apply the passed className
  return <div className={`${styles.container} ${className || ''}`}>{children}</div>;
};

export default Container;