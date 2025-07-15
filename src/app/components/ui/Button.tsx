'use client';

import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'google';
  fullWidth?: boolean;
}

const Button = ({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) => {
  
  // CORRECTED: Added the global 'btn' class to ensure base styles are always applied.
  // Note: The 'btn-primary' variant is handled by globals.css now.
  const buttonClasses = [
    'btn', 
    variant === 'primary' ? 'btn-primary' : '',
    styles.btn,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;