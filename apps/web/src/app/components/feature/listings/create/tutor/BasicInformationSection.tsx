/**
 * Filename: BasicInformationSection.tsx
 * Purpose: Provider-specific basic information section (name, headline, bio)
 * Usage: Tutor and Agent service listings
 * Created: 2026-01-19
 */

import styles from '../shared/FormSections.module.css';

interface BasicInformationSectionProps {
  title: string;
  headline?: string;
  bio?: string;
  onTitleChange: (title: string) => void;
  onHeadlineChange?: (headline: string) => void;
  onBioChange?: (bio: string) => void;
  showHeadline?: boolean;
  showBio?: boolean;
  titleLabel?: string;
  titlePlaceholder?: string;
  headlineLabel?: string;
  headlinePlaceholder?: string;
  bioLabel?: string;
  bioPlaceholder?: string;
  titleMaxLength?: number;
  headlineMaxLength?: number;
  bioMaxLength?: number;
  errors?: Record<string, string>;
}

export function BasicInformationSection({
  title,
  headline = '',
  bio = '',
  onTitleChange,
  onHeadlineChange,
  onBioChange,
  showHeadline = true,
  showBio = true,
  titleLabel = 'Service Title',
  titlePlaceholder = 'E.g., Expert GCSE Maths Tutor - Build Confidence & Achieve A*',
  headlineLabel = 'Professional Headline',
  headlinePlaceholder = 'E.g., Experienced Mathematics Tutor | 10+ Years | Exam Specialist',
  bioLabel = 'Professional Bio',
  bioPlaceholder = 'Tell potential clients about your background, expertise, teaching philosophy, and what makes you unique...',
  titleMaxLength = 120,
  headlineMaxLength = 100,
  bioMaxLength = 500,
  errors = {},
}: BasicInformationSectionProps) {
  const titleCharCount = title.length;
  const headlineCharCount = headline.length;
  const bioCharCount = bio.length;

  const isTitleNearMax = titleCharCount > titleMaxLength * 0.9;
  const isHeadlineNearMax = headlineCharCount > headlineMaxLength * 0.9;
  const isBioNearMax = bioCharCount > bioMaxLength * 0.9;

  return (
    <div>
      {/* Service Title */}
      <div className={`${styles.formSection} ${styles.fullWidth}`}>
        <label className={styles.label}>
          {titleLabel} <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          maxLength={titleMaxLength}
        />
        {errors.title ? (
          <p className={styles.errorText}>{errors.title}</p>
        ) : (
          <p className={`${styles.helperText} ${isTitleNearMax ? styles.warningText : ''}`}>
            {titleCharCount}/{titleMaxLength} characters • Make it descriptive and appealing
          </p>
        )}
      </div>

      {/* Professional Headline (Optional) */}
      {showHeadline && onHeadlineChange && (
        <div className={`${styles.formSection} ${styles.fullWidth}`}>
          <label className={styles.label}>{headlineLabel}</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            placeholder={headlinePlaceholder}
            className={`${styles.input} ${errors.headline ? styles.inputError : ''}`}
            maxLength={headlineMaxLength}
          />
          {errors.headline ? (
            <p className={styles.errorText}>{errors.headline}</p>
          ) : (
            <p className={`${styles.helperText} ${isHeadlineNearMax ? styles.warningText : ''}`}>
              {headlineCharCount}/{headlineMaxLength} characters • Optional but recommended
            </p>
          )}
        </div>
      )}

      {/* Professional Bio (Optional) */}
      {showBio && onBioChange && (
        <div className={`${styles.formSection} ${styles.fullWidth}`}>
          <label className={styles.label}>{bioLabel}</label>
          <textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder={bioPlaceholder}
            rows={5}
            className={`${styles.textarea} ${errors.bio ? styles.inputError : ''}`}
            maxLength={bioMaxLength}
          />
          {errors.bio ? (
            <p className={styles.errorText}>{errors.bio}</p>
          ) : (
            <p className={`${styles.helperText} ${isBioNearMax ? styles.warningText : ''}`}>
              {bioCharCount}/{bioMaxLength} characters • Share your story and expertise
            </p>
          )}
        </div>
      )}
    </div>
  );
}
