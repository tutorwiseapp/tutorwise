
import styles from './ActivityFeed.module.css';

export default function ActivityFeed() {
  const verifications = ["Email", "Phone", "Government ID", "DBS Check"];

  return (
    <div className={styles.activityFeed}>
      <div className={styles.activity}>
        <h2 className={styles.title}>Verifications</h2>
        <div className={styles.verificationList}>
          {verifications.map((item) => (
            <div key={item} className={styles.verificationItem}>
              <span>{item}</span>
              <input type="checkbox" className={styles.checkbox} checked disabled />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.activity}>
        <h2 className={styles.title}>Recent Activities</h2>
        <div className={styles.activityList}>
          <p className={styles.activityText}>John just received a 5-star review from Sarah K.</p>
          <p className={styles.activityText}>Your listing for &apos;GCSE Maths&apos; was viewed 25 times this week.</p>
          <p className={styles.activityText}>You have a new booking request for Saturday.</p>
        </div>
      </div>
      <div className={styles.activity}>
        <h2 className={styles.title}>Recent Messages</h2>
        <div className={styles.activityList}>
          <p className={styles.activityText}>You have a new message regarding &quot;A-Level Chemistry&quot;.</p>
          <p className={styles.activityText}>David L. replied to your message.</p>
          <p className={styles.activityText}>Reminder: Your lesson with Jane D. is tomorrow.</p>
        </div>
      </div>
      <div className={styles.activity}>
        <h2 className={styles.title}>Recent Connections</h2>
        <div className={styles.activityList}>
          <p className={styles.activityText}>You connected with David L.</p>
          <p className={styles.activityText}>Sarah K. is now following you.</p>
          <p className={styles.activityText}>You have a new connection request.</p>
        </div>
      </div>
    </div>
  );
}
