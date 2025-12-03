
import styles from './ReviewCard.module.css';

export interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  comment: string;
}

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.header}>
        <div className={styles.authorInfo}>
          <div className={styles.avatar}></div>
          <div>
            <p className={styles.authorName}>{review.author}</p>
            <p className={styles.reviewDate}>{review.date}</p>
          </div>
        </div>
      </div>
      <p className={styles.comment}>{review.comment}</p>
    </div>
  );
}
