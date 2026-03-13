/**
 * Filename: apps/web/src/app/components/resources/ArticleCard.tsx
 * Purpose: Compact article card for wiselist display
 * Created: 2026-01-16
 *
 * Similar to MarketplaceListingCard pattern but for resource articles
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './ArticleCard.module.css';

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  featured_image_url?: string;
  read_time?: string;
  category?: string;
  published_at?: string;
  author_name?: string;
}

interface ArticleCardProps {
  article: BlogArticle;
  showRemoveButton?: boolean;
  onRemove?: () => void;
  savedAt?: string; // When the article was saved
}

/**
 * ArticleCard Component
 *
 * Displays a compact resource article card in wiselists.
 * Matches the visual style of MarketplaceListingCard.
 */
export default function ArticleCard({
  article,
  showRemoveButton = false,
  onRemove,
  savedAt,
}: ArticleCardProps) {
  const imageUrl = article.featured_image_url || '/images/resource-placeholder.jpg';

  // Format category for display
  const categoryDisplay = article.category
    ? article.category
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Article';

  // Format date
  const formattedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className={styles.cardContainer}>
      <Link href={`/resources/${article.slug}`} className={styles.cardLink}>
        {/* Featured Image */}
        <div className={styles.imageContainer}>
          <Image src={imageUrl} alt={article.title} fill className={styles.image} />

          {/* Category Badge */}
          <div className={styles.categoryBadge}>{categoryDisplay}</div>
        </div>

        {/* Content */}
        <div className={styles.contentContainer}>
          {/* Title */}
          <h3 className={styles.title}>{article.title}</h3>

          {/* Description */}
          <p className={styles.description}>{article.description}</p>

          {/* Metadata Row */}
          <div className={styles.metadataRow}>
            {article.author_name && <span className={styles.author}>{article.author_name}</span>}
            {formattedDate && <span className={styles.date}>{formattedDate}</span>}
            {article.read_time && <span className={styles.readTime}>{article.read_time}</span>}
          </div>

          {/* Saved At (if in wiselist) */}
          {savedAt && (
            <div className={styles.savedInfo}>
              Saved{' '}
              {new Date(savedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </div>
          )}
        </div>
      </Link>

      {/* Remove Button */}
      {showRemoveButton && onRemove && (
        <button
          className={styles.removeButton}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove from wiselist"
        >
          ×
        </button>
      )}
    </div>
  );
}
