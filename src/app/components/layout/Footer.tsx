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
        <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
        <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer">TikTok</a>
      </p>
    </footer>
  );
};

export default Footer;