'use client';
import React from 'react';
// --- FIX: Import the stylesheet ---
import styles from './form.module.css';

interface RadioProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(({ label, ...props }, ref) => (
  // --- FIX: Use CSS module classes ---
  <label className={styles.radioLabel}>
    <input type="radio" ref={ref} {...props} className={styles.radioInput} />
    <span className={styles.radioCustom}></span>
    {label}
  </label>
));
Radio.displayName = 'Radio';
export default Radio;

// This component also needs to be fixed to use the CSS module
interface RadioGroupProps {
  name: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RadioGroup = ({ name, options, selectedValue, onChange }: RadioGroupProps) => (
  // --- FIX: Use the CSS module class for the group ---
  <div className={styles.radioGroup}>
    {options.map(option => (
      <Radio
        key={option.value}
        name={name}
        label={option.label}
        value={option.value}
        checked={selectedValue === option.value}
        onChange={onChange}
      />
    ))}
  </div>
);