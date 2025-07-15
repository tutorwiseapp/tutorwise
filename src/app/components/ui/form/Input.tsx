import React from 'react';
import styles from './form.module.css';

// Add a 'variant' to the props
type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  variant?: 'default' | 'quiet';
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', ...props }, ref) => {
    
    // Combine the base class with the variant class
    const inputClasses = `${styles.input} ${styles[variant]}`;
    
    return <input {...props} ref={ref} className={inputClasses} />;
  }
);

Input.displayName = 'Input';

export default Input;