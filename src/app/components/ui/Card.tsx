/*
 * Filename: src/app/components/ui/Card.tsx
 * Purpose: A reusable container component with VDL styling.
 * Change History:
 * C002 - 2025-08-10 : 22:00 - Definitive fix for 'children' prop error.
 * C001 - 2025-07-20 : 11:00 - Initial creation and prop type correction.
 * Last Modified: 2025-08-10 : 22:00
 * Requirement ID: VIN-UI-002
 * Change Summary: This is the definitive and final fix for the build error on the payments page. The `children` prop in `CardProps` has been made optional (`children?: React.ReactNode`). This makes the component more flexible and allows it to be used as a simple container without child elements, resolving the TypeScript error.
 * Impact Analysis: This change fixes a critical, build-blocking error and makes the Card component more robust for future use.
 * Dependencies: "react", "./Card.module.css".
 */
import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode; // --- THIS IS THE DEFINITIVE FIX ---
  className?: string;
}

const Card = ({ children, className, ...props }: CardProps) => {
  const cardClasses = `${styles.card} ${className || ''}`;
  
  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;