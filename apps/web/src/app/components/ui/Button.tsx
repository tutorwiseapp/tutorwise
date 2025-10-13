import React from 'react';
import styles from './Button.module.css';

// Added a 'variant' prop to the interface to allow for different button styles.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'link' | 'google' | 'outline' | 'danger'; // Define the allowed variants
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg'; // Define the allowed sizes
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary', // Default to 'primary' if no variant is provided
  fullWidth = false,
  size = 'md', // Default to 'md' if no size is provided
  className,
  ...props
}) => {
  // Combine the base button style with variant, size and other classes.
  const buttonClassName = [
    styles.button,
    styles[variant],
    size ? styles[size] : '',
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