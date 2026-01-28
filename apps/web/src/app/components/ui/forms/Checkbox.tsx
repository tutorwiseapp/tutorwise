'use client';
import React from 'react';
import styles from './form.module.css';

// Define the props our custom component accepts.
// We Omit the standard 'onChange' to avoid conflicts and add our own 'onCheckedChange'.
interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'onChange'> {
  label: string;
  onCheckedChange?: (checked: boolean) => void;
  ref?: React.Ref<HTMLInputElement>;
}

const Checkbox = ({ label, onCheckedChange, ref, ...props }: CheckboxProps) => {

  // This is the event handler for the real input element's onChange event.
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // When the real input changes, we call our custom onCheckedChange prop
    // with the new boolean value (true or false).
    onCheckedChange?.(event.target.checked);
  };

  return (
    <label className={styles.checkboxLabel}>
      {/* We pass our new handleChange function to the standard onChange event */}
      <input
        type="checkbox"
        ref={ref}
        {...props}
        onChange={handleChange}
        className={styles.checkboxInput}
      />
      <span className={styles.checkboxCustom}>
        <svg viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
        </svg>
      </span>

      {/* Only render the label text if it's not empty */}
      {label && <span>{label}</span>}
    </label>
  );
};

export default Checkbox;
