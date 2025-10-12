
import styles from './AvailabilitySection.module.css';

export default function AvailabilitySection() {
  return (
    <div className={styles.availabilitySection}>
      <div className={styles.available}>
        <h2 className={styles.title}>Available Time Slots</h2>
        <ul>
          <li>Every Tuesday, 5:00 PM - 7:00 PM</li>
          <li>Every Wednesday, 5:00 PM - 7:00 PM</li>
          <li>Every Saturday, 9:00 AM - 1:00 PM</li>
        </ul>
      </div>
      <div className={styles.unavailable}>
        <h2 className={styles.title}>Unavailable Periods</h2>
        <ul>
          <li>25 Jul 2025 - 05 Sep 2025</li>
        </ul>
      </div>
    </div>
  );
}
