import React from 'react';
import Link, { LinkProps } from 'next/link';
import styles from './NavLink.module.css';

interface NavLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
}

const NavLink = ({ children, className, ...props }: NavLinkProps) => {
  const navLinkClasses = `${styles.navLink} ${className || ''}`;
  
  return (
    <Link {...props} className={navLinkClasses}>
      {children}
    </Link>
  );
};

export default NavLink;