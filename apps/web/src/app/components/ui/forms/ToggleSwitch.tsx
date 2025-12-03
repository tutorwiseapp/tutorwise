'use client';
import React from 'react';
// Corrected: Removed unused 'styles' import.
// import styles from './form.module.css';

interface ToggleSwitchProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}

// Corrected: The function now uses its props.
const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(({ label, ...props }, ref) => (
  <label className="toggleLabel">
    <span>{label}</span>
    <div className="toggleSwitch">
      <input type="checkbox" ref={ref} {...props} className="toggleInput" />
      <span className="toggleSlider"></span>
    </div>
  </label>
));

ToggleSwitch.displayName = 'ToggleSwitch';
export default ToggleSwitch;