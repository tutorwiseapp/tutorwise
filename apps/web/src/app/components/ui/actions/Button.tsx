// apps/web/src/app/components/ui/Button.tsx
'use client';

import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  href?: string;
  fullWidth?: boolean;
  square?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  href,
  fullWidth = false,
  square = false,
  className: customClassName,
  ...props
}) => {
  const className = `
    ${styles.button}
    ${styles[variant]}
    ${styles[size]}
    ${fullWidth ? styles.fullWidth : ''}
    ${square ? styles.square : ''}
    ${props.disabled || isLoading ? styles.disabled : ''}
    ${customClassName || ''}
  `.trim();

  const content = isLoading ? (
    <span className={styles.loader} />
  ) : (
    children
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} disabled={props.disabled || isLoading} {...props}>
      {content}
    </button>
  );
};

export default Button;
