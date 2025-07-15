'use client';
import React from 'react';
import styles from './form.module.css'; // Corrected import path
// ... rest of the code is the same
interface RadioProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}
const Radio = React.forwardRef<HTMLInputElement, RadioProps>(({ label, ...props }, ref) => { /* ... */ });
Radio.displayName = 'Radio';
export default Radio;
export const RadioGroup = ({ name, options, selectedValue, onChange }) => { /* ... */ };