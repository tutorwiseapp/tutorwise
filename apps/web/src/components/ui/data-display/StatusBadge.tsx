import React from 'react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  // Generate a CSS-friendly class name from the status string
  // e.g., "Signed Up" -> "statusSignedUp"
  const statusClass = 'status' + status.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');

  return (
    <span className={`${styles.statusBadge} ${styles[statusClass] || styles.statusDefault}`}>
      {status}
    </span>
  );
};

export default StatusBadge;