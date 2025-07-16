'use client';
import React from 'react';
// Corrected: Removed unused 'styles' import.
// import styles from './form.module.css';

interface RadioProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}

// Corrected: The function now uses its props.
const Radio = React.forwardRef<HTMLInputElement, RadioProps>(({ label, ...props }, ref) => (
  <label className="radioLabel">
    <input type="radio" ref={ref} {...props} className="radioInput" />
    <span className="radioCustom"></span>
    {label}
  </label>
));
Radio.displayName = 'Radio';
export default Radio;

// This component was completely empty. It's now functional.
interface RadioGroupProps {
  name: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RadioGroup = ({ name, options, selectedValue, onChange }: RadioGroupProps) => (
  <div className="radioGroup">
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