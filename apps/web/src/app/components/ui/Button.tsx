import React from 'react';
import styles from './Button.module.css';

// Added a 'variant' prop to the interface to allow for different button styles.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'link' | 'google'; // Define the allowed variants
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', // Default to 'primary' if no variant is provided
  fullWidth = false,
  className, 
  ...props 
}) => {
  // Combine the base button style with variant and other classes.
  const buttonClassName = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    className || ''
  ].join(' ').trim();

  return (
    <button className={buttonClassName} {...props}>
      {children}
    </button>
  );
};

export default Button;