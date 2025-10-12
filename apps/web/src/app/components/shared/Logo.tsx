import React from 'react';
import styles from './Logo.module.css';

const Logo = () => {
  return (
    <svg
      className={styles.logo}
      width="150"
      height="36"
      viewBox="0 0 150 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="10" y="28" className={styles.logoText}>tutorwise</text>
    </svg>
  );
};

export default Logo;
