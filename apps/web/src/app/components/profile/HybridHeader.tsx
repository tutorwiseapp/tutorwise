
import styles from './HybridHeader.module.css';
import type { Listing } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface HybridHeaderProps {
  listing: Listing;
}

export default function HybridHeader({ listing }: HybridHeaderProps) {
  return (
    <div className={styles.hybridHeader}>
      <div className={styles.left}>
        <div className={styles.avatar}>
          {listing.images && listing.images.length > 0 ? (
            <img src={listing.images[0]} alt={listing.title} />
          ) : <div className={styles.avatarPlaceholder}></div>}
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>{listing.title}</h1>
          <p className={styles.specialty}>Maths Specialist • {listing.location_city || 'United Kingdom'}</p>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Credibility Score</p>
            <p className={styles.statValue}>75</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Solo Rate</p>
            <p className={styles.statValue}>£{listing.hourly_rate}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Group Rate</p>
            <p className={styles.statValue}>£30</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button className={styles.button}>Request my services</Button>
          <Button className={styles.button} data-variant="outline">Send me a message</Button>
          <Button className={styles.button} data-variant="outline">Connect with me</Button>
        </div>
      </div>
    </div>
  );
}
