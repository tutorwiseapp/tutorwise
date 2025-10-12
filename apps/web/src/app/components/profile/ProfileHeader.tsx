
import styles from './ProfileHeader.module.css';
import type { Listing } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface ProfileHeaderProps {
  listing: Listing;
}

export default function ProfileHeader({ listing }: ProfileHeaderProps) {
  return (
    <div className={styles.profileHeader}>
      <div className={styles.left}>
        <div className={styles.avatar}>
          <img src={listing.images?.[0]} alt={listing.title} />
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>{listing.title}</h1>
          <p className={styles.specialty}>Tutor</p>
          <p className={styles.location}>{listing.location_city}, United Kingdom</p>
          <div className={styles.links}>
            <a className={styles.link}>Refer Me</a>
            <a className={styles.link}>Book Now</a>
          </div>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Tutor Credible Score</p>
            <p className={styles.statValue}>75</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>One to One Rate</p>
            <p className={styles.statValue}>£{listing.hourly_rate}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statLabel}>Group Session Rate</p>
            <p className={styles.statValue}>£30</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button>Request my services</Button>
          <Button variant="outline">Send me a message</Button>
          <Button variant="outline">Connect with me</Button>
        </div>
      </div>
    </div>
  );
}
