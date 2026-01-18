/**
 * Filename: apps/web/src/lib/seo/healthChecker.ts
 * Purpose: Utility to check SEO health of resource articles
 * Created: 2026-01-15
 */

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  featured_image_url?: string;
  published_at: string;
  updated_at: string;
}

interface SEOIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  recommendation: string;
}

interface SEOHealthReport {
  articleId: string;
  score: number; // 0-100
  issues: SEOIssue[];
  strengths: string[];
}

export function checkArticleSEOHealth(article: BlogArticle): SEOHealthReport {
  const issues: SEOIssue[] = [];
  const strengths: string[] = [];
  let score = 100;

  // 1. Check Title Length
  const titleLength = (article.meta_title || article.title).length;
  if (titleLength < 30) {
    issues.push({
      severity: 'warning',
      field: 'title',
      message: `Title is too short (${titleLength} chars)`,
      recommendation: 'Titles should be 30-60 characters for optimal search display',
    });
    score -= 10;
  } else if (titleLength > 60) {
    issues.push({
      severity: 'warning',
      field: 'title',
      message: `Title is too long (${titleLength} chars)`,
      recommendation: 'Titles longer than 60 characters may be truncated in search results',
    });
    score -= 5;
  } else {
    strengths.push('Title length is optimal');
  }

  // 2. Check Meta Description
  if (!article.meta_description && !article.description) {
    issues.push({
      severity: 'error',
      field: 'meta_description',
      message: 'Missing meta description',
      recommendation: 'Add a compelling 120-155 character description',
    });
    score -= 15;
  } else {
    const descLength = (article.meta_description || article.description).length;
    if (descLength < 120) {
      issues.push({
        severity: 'warning',
        field: 'meta_description',
        message: `Meta description is too short (${descLength} chars)`,
        recommendation: 'Descriptions should be 120-155 characters',
      });
      score -= 10;
    } else if (descLength > 155) {
      issues.push({
        severity: 'info',
        field: 'meta_description',
        message: `Meta description is too long (${descLength} chars)`,
        recommendation: 'Consider shortening to 155 characters to avoid truncation',
      });
      score -= 5;
    } else {
      strengths.push('Meta description length is optimal');
    }
  }

  // 3. Check Meta Keywords
  if (!article.meta_keywords || article.meta_keywords.length === 0) {
    issues.push({
      severity: 'warning',
      field: 'meta_keywords',
      message: 'No meta keywords defined',
      recommendation: 'Add 3-5 relevant keywords for better categorization',
    });
    score -= 5;
  } else if (article.meta_keywords.length > 10) {
    issues.push({
      severity: 'info',
      field: 'meta_keywords',
      message: 'Too many meta keywords',
      recommendation: 'Focus on 3-5 most relevant keywords',
    });
    score -= 3;
  } else {
    strengths.push('Meta keywords are well-defined');
  }

  // 4. Check Featured Image
  if (!article.featured_image_url) {
    issues.push({
      severity: 'warning',
      field: 'featured_image',
      message: 'Missing featured image',
      recommendation: 'Add a featured image for better social sharing and engagement',
    });
    score -= 10;
  } else {
    strengths.push('Featured image is set');
  }

  // 5. Check Slug
  const slugLength = article.slug.length;
  if (slugLength > 60) {
    issues.push({
      severity: 'info',
      field: 'slug',
      message: 'URL slug is quite long',
      recommendation: 'Shorter URLs are easier to share and remember',
    });
    score -= 3;
  } else {
    strengths.push('URL slug is concise');
  }

  // 6. Check Content Length
  const contentLength = article.content?.length || 0;
  if (contentLength < 300) {
    issues.push({
      severity: 'error',
      field: 'content',
      message: `Content is very short (${contentLength} chars)`,
      recommendation: 'Aim for at least 1000 words (5000+ chars) for better SEO',
    });
    score -= 20;
  } else if (contentLength < 1000) {
    issues.push({
      severity: 'warning',
      field: 'content',
      message: `Content is short (${contentLength} chars)`,
      recommendation: 'Consider expanding to 1000+ words for better depth',
    });
    score -= 10;
  } else {
    strengths.push('Content length is substantial');
  }

  // 7. Check Content Freshness
  const daysSinceUpdate = Math.floor(
    (new Date().getTime() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceUpdate > 180) {
    issues.push({
      severity: 'info',
      field: 'freshness',
      message: `Content hasn't been updated in ${daysSinceUpdate} days`,
      recommendation: 'Consider refreshing old content to maintain relevance',
    });
    score -= 5;
  } else if (daysSinceUpdate < 30) {
    strengths.push('Content is fresh and recently updated');
  }

  // 8. Check Title Contains Keywords
  const titleWords = (article.meta_title || article.title).toLowerCase().split(' ');
  const descWords = (article.meta_description || article.description).toLowerCase().split(' ');
  const commonWords = titleWords.filter((word) => descWords.includes(word) && word.length > 4);

  if (commonWords.length > 0) {
    strengths.push('Title and description share keywords');
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    articleId: article.id,
    score,
    issues,
    strengths,
  };
}

export function getSEOScoreColor(score: number): string {
  if (score >= 90) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // yellow
  if (score >= 50) return '#ef4444'; // orange
  return '#dc2626'; // red
}

export function getSEOScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
}

export async function generateSEORecommendations(
  article: BlogArticle
): Promise<string[]> {
  const recommendations: string[] = [];
  const healthReport = checkArticleSEOHealth(article);

  // Add recommendations based on issues
  for (const issue of healthReport.issues) {
    if (issue.severity === 'error' || issue.severity === 'warning') {
      recommendations.push(issue.recommendation);
    }
  }

  // Add general best practices
  if (recommendations.length === 0) {
    recommendations.push('Your article SEO is in great shape!');
    recommendations.push('Consider adding internal links to related articles');
    recommendations.push('Share on social media to build backlinks');
  }

  return recommendations;
}
