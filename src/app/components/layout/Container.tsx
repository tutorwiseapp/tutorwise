import React from 'react';
import styles from './Container.module.css';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  // --- CHANGE 1: Add 'wide' to the list of official variants ---
  variant?: 'default' | 'narrow' | 'wide'; 
}

const Container = ({ children, className, variant = 'default' }: ContainerProps) => {
  const containerClasses = [
    styles.container,
    variant === 'narrow' ? styles.narrow : '',
    // --- CHANGE 2: Add the logic for the new 'wide' variant ---
    variant === 'wide' ? styles.wide : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={containerClasses}>{children}</div>;
};

export default Container;