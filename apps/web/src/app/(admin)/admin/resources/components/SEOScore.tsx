/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/SEOScore.tsx
 * Purpose: SEO analysis and scoring component for article content
 * Created: 2026-02-02
 *
 * Analyzes:
 * - Title length and keyword usage
 * - Meta description quality
 * - Content length and readability
 * - Heading structure
 * - Image optimization
 * - URL/slug quality
 */
'use client';

import React, { useMemo } from 'react';
import styles from './SEOScore.module.css';

interface SEOScoreProps {
  title: string;
  slug: string;
  description: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImageUrl?: string;
}

interface SEOCheck {
  id: string;
  name: string;
  status: 'good' | 'warning' | 'error';
  message: string;
  score: number;
}

export default function SEOScore({
  title,
  slug,
  description,
  content,
  metaTitle,
  metaDescription,
  featuredImageUrl,
}: SEOScoreProps) {
  const checks = useMemo((): SEOCheck[] => {
    const results: SEOCheck[] = [];

    // Title check
    const titleLength = (metaTitle || title).length;
    if (titleLength >= 50 && titleLength <= 60) {
      results.push({
        id: 'title',
        name: 'Title Length',
        status: 'good',
        message: `Title is ${titleLength} characters (ideal: 50-60)`,
        score: 15,
      });
    } else if (titleLength >= 30 && titleLength <= 70) {
      results.push({
        id: 'title',
        name: 'Title Length',
        status: 'warning',
        message: `Title is ${titleLength} characters (ideal: 50-60)`,
        score: 10,
      });
    } else {
      results.push({
        id: 'title',
        name: 'Title Length',
        status: 'error',
        message: `Title is ${titleLength} characters (ideal: 50-60)`,
        score: 0,
      });
    }

    // Meta description check
    const metaDescLength = (metaDescription || description).length;
    if (metaDescLength >= 150 && metaDescLength <= 160) {
      results.push({
        id: 'metaDesc',
        name: 'Meta Description',
        status: 'good',
        message: `Meta description is ${metaDescLength} characters (ideal: 150-160)`,
        score: 15,
      });
    } else if (metaDescLength >= 100 && metaDescLength <= 200) {
      results.push({
        id: 'metaDesc',
        name: 'Meta Description',
        status: 'warning',
        message: `Meta description is ${metaDescLength} characters (ideal: 150-160)`,
        score: 10,
      });
    } else if (metaDescLength === 0) {
      results.push({
        id: 'metaDesc',
        name: 'Meta Description',
        status: 'error',
        message: 'No meta description provided',
        score: 0,
      });
    } else {
      results.push({
        id: 'metaDesc',
        name: 'Meta Description',
        status: 'warning',
        message: `Meta description is ${metaDescLength} characters (ideal: 150-160)`,
        score: 5,
      });
    }

    // Content length check
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 1500) {
      results.push({
        id: 'contentLength',
        name: 'Content Length',
        status: 'good',
        message: `${wordCount} words (excellent for SEO)`,
        score: 20,
      });
    } else if (wordCount >= 800) {
      results.push({
        id: 'contentLength',
        name: 'Content Length',
        status: 'warning',
        message: `${wordCount} words (aim for 1500+ for better ranking)`,
        score: 15,
      });
    } else if (wordCount >= 300) {
      results.push({
        id: 'contentLength',
        name: 'Content Length',
        status: 'warning',
        message: `${wordCount} words (minimum 800 recommended)`,
        score: 10,
      });
    } else {
      results.push({
        id: 'contentLength',
        name: 'Content Length',
        status: 'error',
        message: `${wordCount} words (too short, aim for 800+)`,
        score: 0,
      });
    }

    // Heading structure check
    const hasH1 = /^#\s+/m.test(content);
    const hasH2 = /^##\s+/m.test(content);
    const h2Count = (content.match(/^##\s+/gm) || []).length;

    if (hasH1 && hasH2 && h2Count >= 2) {
      results.push({
        id: 'headings',
        name: 'Heading Structure',
        status: 'good',
        message: `Good structure with H1 and ${h2Count} H2 headings`,
        score: 15,
      });
    } else if (hasH2) {
      results.push({
        id: 'headings',
        name: 'Heading Structure',
        status: 'warning',
        message: `Has ${h2Count} H2 heading(s). Consider adding more structure`,
        score: 10,
      });
    } else {
      results.push({
        id: 'headings',
        name: 'Heading Structure',
        status: 'error',
        message: 'No headings found. Add H2 headings for better structure',
        score: 0,
      });
    }

    // Featured image check
    if (featuredImageUrl && featuredImageUrl.length > 0) {
      results.push({
        id: 'image',
        name: 'Featured Image',
        status: 'good',
        message: 'Featured image is set',
        score: 10,
      });
    } else {
      results.push({
        id: 'image',
        name: 'Featured Image',
        status: 'error',
        message: 'No featured image. Add one for better social sharing',
        score: 0,
      });
    }

    // URL/Slug check
    const slugLength = slug.length;
    const hasHyphens = slug.includes('-');
    const isClean = /^[a-z0-9-]+$/.test(slug);

    if (slugLength >= 10 && slugLength <= 60 && hasHyphens && isClean) {
      results.push({
        id: 'slug',
        name: 'URL Slug',
        status: 'good',
        message: 'Clean, readable URL slug',
        score: 10,
      });
    } else if (isClean && slugLength > 0) {
      results.push({
        id: 'slug',
        name: 'URL Slug',
        status: 'warning',
        message: slugLength > 60 ? 'Slug is too long' : 'Slug could be more descriptive',
        score: 5,
      });
    } else {
      results.push({
        id: 'slug',
        name: 'URL Slug',
        status: 'error',
        message: 'Invalid or missing URL slug',
        score: 0,
      });
    }

    // Internal links check
    const internalLinks = (content.match(/\[.*?\]\(\/.*?\)/g) || []).length;
    if (internalLinks >= 3) {
      results.push({
        id: 'internalLinks',
        name: 'Internal Links',
        status: 'good',
        message: `${internalLinks} internal links found`,
        score: 10,
      });
    } else if (internalLinks >= 1) {
      results.push({
        id: 'internalLinks',
        name: 'Internal Links',
        status: 'warning',
        message: `${internalLinks} internal link(s). Add more for better SEO`,
        score: 5,
      });
    } else {
      results.push({
        id: 'internalLinks',
        name: 'Internal Links',
        status: 'warning',
        message: 'No internal links. Consider adding links to related content',
        score: 0,
      });
    }

    // Readability check (simple Flesch-Kincaid approximation)
    const sentences = content.split(/[.!?]+/).filter(Boolean).length;
    const words = wordCount;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;

    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      results.push({
        id: 'readability',
        name: 'Readability',
        status: 'good',
        message: 'Good sentence length for readability',
        score: 5,
      });
    } else if (avgWordsPerSentence > 0) {
      results.push({
        id: 'readability',
        name: 'Readability',
        status: 'warning',
        message:
          avgWordsPerSentence > 20
            ? 'Sentences are too long. Break them up'
            : 'Sentences are short. Consider varying length',
        score: 2,
      });
    } else {
      results.push({
        id: 'readability',
        name: 'Readability',
        status: 'warning',
        message: 'Not enough content to analyze readability',
        score: 0,
      });
    }

    return results;
  }, [title, slug, description, content, metaTitle, metaDescription, featuredImageUrl]);

  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const maxScore = 100;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const getScoreColor = () => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = () => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>SEO Score</h4>
        <div className={styles.scoreCircle}>
          <span className={styles.scoreNumber} style={{ color: getScoreColor() }}>
            {percentage}
          </span>
          <span className={styles.scoreLabel}>{getScoreLabel()}</span>
        </div>
      </div>

      <div className={styles.checksList}>
        {checks.map((check) => (
          <div key={check.id} className={`${styles.checkItem} ${styles[check.status]}`}>
            <span className={styles.checkIcon}>
              {check.status === 'good' && '✓'}
              {check.status === 'warning' && '!'}
              {check.status === 'error' && '✕'}
            </span>
            <div className={styles.checkContent}>
              <span className={styles.checkName}>{check.name}</span>
              <span className={styles.checkMessage}>{check.message}</span>
            </div>
            <span className={styles.checkScore}>+{check.score}</span>
          </div>
        ))}
      </div>

      <div className={styles.tips}>
        <h5 className={styles.tipsTitle}>Quick Tips</h5>
        <ul className={styles.tipsList}>
          <li>Include your main keyword in the title and first paragraph</li>
          <li>Use descriptive alt text for images</li>
          <li>Link to 2-3 related articles on your site</li>
          <li>Update older content to keep it fresh</li>
        </ul>
      </div>
    </div>
  );
}
