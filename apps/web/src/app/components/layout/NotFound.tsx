
import Link from 'next/link';
import styles from './NotFound.module.css';

interface NotFoundProps {
  title: string;
  message: string;
  linkText: string;
  linkHref: string;
}

export default function NotFound({ title, message, linkText, linkHref }: NotFoundProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <Link href={linkHref} className={styles.link}>
          {linkText}
        </Link>
      </div>
    </div>
  );
}
