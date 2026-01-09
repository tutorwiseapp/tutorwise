'use client';
import React from 'react';
import styles from './form.module.css';

interface ToggleSwitchProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
}

const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(({ label, ...props }, ref) => (
  <label className={styles.toggleLabel}>
    <span>{label}</span>
    <div className={styles.toggleSwitch}>
      <input type="checkbox" ref={ref} {...props} className={styles.toggleInput} />
      <span className={styles.toggleSlider}></span>
    </div>
  </label>
));

ToggleSwitch.displayName = 'ToggleSwitch';
export default ToggleSwitch;
