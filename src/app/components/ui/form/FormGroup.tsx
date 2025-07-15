import React from 'react';
import styles from './form.module.css';

interface FormGroupProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}

const FormGroup = ({ label, htmlFor, children }: FormGroupProps) => {
  return (
    <div className={styles.formGroup}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {children}
    </div>
  );
};

export default FormGroup;