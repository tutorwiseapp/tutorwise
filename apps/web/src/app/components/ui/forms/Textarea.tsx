import React from 'react';
import styles from './form.module.css'; // We use the same shared stylesheet

// This allows the component to accept any standard HTML textarea property
type TextareaProps = React.ComponentPropsWithoutRef<'textarea'> & {
  variant?: 'default' | 'quiet'; // Keeping it consistent with Input
  ref?: React.Ref<HTMLTextAreaElement>;
};

const Textarea = ({ variant = 'default', ref, ...props }: TextareaProps) => {
  // Combine the base class with the variant class
  const textareaClasses = `${styles.textarea} ${styles[variant]}`;

  return <textarea {...props} ref={ref} className={textareaClasses} />;
};

export default Textarea;
