import React from 'react';
import styles from './Card.module.css';

// CORRECTED: The props interface now extends React.HTMLAttributes<HTMLDivElement>.
// This allows the component to accept any standard div props, including 'onClick'.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

// CORRECTED: Destructure `...props` to collect any additional attributes passed to the component.
const Card = ({ children, className, ...props }: CardProps) => {
  const cardClasses = `${styles.card} ${className || ''}`;
  
  // CORRECTED: Spread the collected `...props` onto the underlying div element.
  // This passes the 'onClick' handler (and any other attributes) to the div.
  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;