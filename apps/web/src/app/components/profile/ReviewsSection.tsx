
import styles from './ReviewsSection.module.css';
import ReviewCard, { Review } from './ReviewCard';

const placeholderReviews: Review[] = [
  {
    id: '1',
    author: 'Sarah K.',
    date: 'September 2025',
    rating: 5,
    comment: "John is an exceptional tutor. He is patient, knowledgeable, and truly cares about his students' success. My daughter's confidence in Maths has skyrocketed since she started working with him.",
  },
  {
    id: '2',
    author: 'David L.',
    date: 'August 2025',
    rating: 5,
    comment: "We were looking for a tutor to help with SAT prep, and John has been a perfect fit. He has a deep understanding of the material and knows how to explain complex concepts in a simple way.",
  },
  // Add more reviews as needed
];

export default function ReviewsSection() {
  const overallRating = 4.9;
  const totalReviews = 112;

  const ratingBreakdown = [
    { category: 'Communication', rating: 4.9 },
    { category: 'Knowledge', rating: 5.0 },
    { category: 'Punctuality', rating: 4.8 },
    { category: 'Value', rating: 4.9 },
  ];

  return (
    <div className={styles.reviewsSection}>
      <h3 className={styles.title}>★ {overallRating} ({totalReviews} Reviews)</h3>

      {/* Rating Breakdown */}
      <div className={styles.breakdownGrid}>
        {ratingBreakdown.map(({ category, rating }) => (
          <div key={category} className={styles.breakdownItem}>
            <span>{category}</span>
            <div className={styles.ratingBar}>
              <div className={styles.ratingFill} style={{ width: `${(rating / 5) * 100}%` }}></div>
            </div>
            <span>{rating.toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* Individual Reviews */}
      <div className={styles.reviewList}>
        {placeholderReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Show All Reviews Link */}
      <div className={styles.showAllContainer}>
        <a className={styles.showAllLink}>
          Show all {totalReviews} reviews →
        </a>
      </div>
    </div>
  );
}
