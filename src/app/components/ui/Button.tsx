'use client';

import React from 'react';
import styles from './Button.module.css';

// --- THIS IS THE FIX ---
// Added the 'as' prop to allow the component to render as a different element
// and changed children to React.ReactNode to be more flexible.
interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'google';
  fullWidth?: boolean;
  as?: 'button' | 'span';
  children: React.ReactNode; 
}

const Button = ({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  as: Component = 'button', // Default to a button element
  ...props
}: ButtonProps) => {
  
  const buttonClasses = [
    'btn', 
    variant === 'primary' ? 'btn-primary' : '',
    styles.btn,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ');

  // The component now dynamically renders as a <button> or <span>
  return (
    <Component className={buttonClasses} {...props as any}>
      {children}
    </Component>
  );
};

export default Button;