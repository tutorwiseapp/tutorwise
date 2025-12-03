import React from 'react';
import styles from './form.module.css'; // We use the same shared stylesheet

// This allows the component to accept any standard HTML textarea property
type TextareaProps = React.ComponentPropsWithoutRef<'textarea'> & {
  variant?: 'default' | 'quiet'; // Keeping it consistent with Input
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ variant = 'default', ...props }, ref) => {
    // Combine the base class with the variant class
    const textareaClasses = `${styles.textarea} ${styles[variant]}`;
    
    return <textarea {...props} ref={ref} className={textareaClasses} />;
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;