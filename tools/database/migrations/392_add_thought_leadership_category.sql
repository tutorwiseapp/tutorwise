-- Migration 392: Add 'thought-leadership' category to resource_articles
-- Also aligns DB constraint with all categories used in the UI

ALTER TABLE resource_articles DROP CONSTRAINT IF EXISTS valid_category;

ALTER TABLE resource_articles
  ADD CONSTRAINT valid_category CHECK (
    category IN (
      'for-clients', 'for-tutors', 'for-agents',
      'education-insights', 'company-news',
      'best-practices', 'success-stories', 'product-updates',
      'pricing-billing', 'safety-trust', 'content-marketing',
      'about-tutorwise', 'faqs',
      'thought-leadership'
    )
  );
