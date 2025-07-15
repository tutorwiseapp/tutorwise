'use client';
import React from 'react';
import styles from './form.module.css'; // Corrected import path
// ... rest of the code is the same
interface ToggleSwitchProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}
const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(({ label, ...props }, ref) => { /* ... */ });
ToggleSwitch.displayName = 'ToggleSwitch';
export default ToggleSwitch;