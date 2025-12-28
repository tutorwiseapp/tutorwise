/**
 * Filename: HubToggle.tsx
 * Purpose: Toggle switch component for HubForm (feature flags, settings)
 * Created: 2025-12-28
 * Pattern: Matches HubForm styling and accessibility standards
 */

'use client';

import React from 'react';
import styles from './HubToggle.module.css';

interface HubToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  name?: string;
}

export default function HubToggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  name,
}: HubToggleProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className={styles.toggleWrapper}>
      <label className={styles.toggleContainer}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          name={name}
          className={styles.toggleInput}
        />
        <span className={`${styles.toggleSlider} ${disabled ? styles.disabled : ''}`} />
      </label>
      {(label || description) && (
        <div className={styles.toggleLabels}>
          {label && <span className={styles.toggleLabel}>{label}</span>}
          {description && <span className={styles.toggleDescription}>{description}</span>}
        </div>
      )}
    </div>
  );
}
