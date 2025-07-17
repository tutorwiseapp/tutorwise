import Link from 'next/link';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p>
        <span>© 2025 Vinite. All rights reserved.</span>
        <Link href="/">Home</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/resources">Resources</Link>
        {/* --- THIS IS THE FIX --- */}
        <Link href="/terms-of-service">Terms of Service</Link>
        <Link href="/privacy-policy">Privacy Policy</Link>
        
        {/* Social links can be moved to a separate line or component later if needed */}
        <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
        <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </p>
    </footer>
  );
};

export default Footer;