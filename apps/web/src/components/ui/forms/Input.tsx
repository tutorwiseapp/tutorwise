import React from 'react';
import styles from './form.module.css';

// Add a 'variant' to the props
type InputProps = React.ComponentPropsWithoutRef<'input'> & {
  variant?: 'default' | 'quiet';
  ref?: React.Ref<HTMLInputElement>;
};

const Input = ({ variant = 'default', ref, ...props }: InputProps) => {

  // Combine the base class with the variant class
  const inputClasses = `${styles.input} ${styles[variant]}`;

  return <input {...props} ref={ref} className={inputClasses} />;
};

export default Input;
