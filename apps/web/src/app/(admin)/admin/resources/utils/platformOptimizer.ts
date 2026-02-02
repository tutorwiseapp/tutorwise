/**
 * Filename: apps/web/src/app/(admin)/admin/resources/utils/platformOptimizer.ts
 * Purpose: Optimize article content for different social media platforms
 * Created: 2026-02-02
 *
 * Platform specifications:
 * - LinkedIn: 3000 chars for posts, 1200x627px images (1.91:1)
 * - Facebook: 63,206 chars max, 1200x630px images (1.91:1)
 * - Instagram: 2200 chars for captions, 1080x1080px (1:1) or 1080x1350px (4:5)
 */

export interface PlatformConfig {
  id: string;
  name: string;
  maxCharacters: number;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: string;
  hashtagLimit: number;
  features: string[];
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    maxCharacters: 3000,
    imageWidth: 1200,
    imageHeight: 627,
    aspectRatio: '1.91:1',
    hashtagLimit: 5,
    features: ['professional', 'b2b', 'industry-insights'],
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    maxCharacters: 63206,
    imageWidth: 1200,
    imageHeight: 630,
    aspectRatio: '1.91:1',
    hashtagLimit: 10,
    features: ['engagement', 'community', 'shareable'],
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    maxCharacters: 2200,
    imageWidth: 1080,
    imageHeight: 1080,
    aspectRatio: '1:1',
    hashtagLimit: 30,
    features: ['visual', 'hashtags', 'stories'],
  },
};

export interface OptimizedContent {
  platform: string;
  title: string;
  excerpt: string;
  content: string;
  hashtags: string[];
  characterCount: number;
  isWithinLimit: boolean;
  imageSpecs: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  warnings: string[];
}

/**
 * Optimize article content for a specific platform
 */
export function optimizeForPlatform(
  article: {
    title: string;
    description: string;
    content: string;
    category: string;
  },
  platformId: string
): OptimizedContent {
  const config = PLATFORM_CONFIGS[platformId];
  if (!config) {
    throw new Error(`Unknown platform: ${platformId}`);
  }

  const warnings: string[] = [];

  // Extract plain text from MDX content
  const plainText = stripMdx(article.content);

  // Generate platform-specific excerpt
  const excerpt = generateExcerpt(plainText, config);

  // Generate hashtags based on category and content
  const hashtags = generateHashtags(article.category, plainText, config.hashtagLimit);

  // Optimize title for platform
  const optimizedTitle = optimizeTitle(article.title, platformId);

  // Build final content based on platform
  let optimizedContent = '';

  switch (platformId) {
    case 'linkedin':
      optimizedContent = buildLinkedInContent(optimizedTitle, excerpt, hashtags);
      break;
    case 'facebook':
      optimizedContent = buildFacebookContent(optimizedTitle, excerpt, hashtags);
      break;
    case 'instagram':
      optimizedContent = buildInstagramContent(optimizedTitle, excerpt, hashtags);
      break;
    default:
      optimizedContent = `${optimizedTitle}\n\n${excerpt}`;
  }

  const characterCount = optimizedContent.length;
  const isWithinLimit = characterCount <= config.maxCharacters;

  if (!isWithinLimit) {
    warnings.push(
      `Content exceeds ${config.name} limit (${characterCount}/${config.maxCharacters} characters)`
    );
  }

  return {
    platform: config.name,
    title: optimizedTitle,
    excerpt,
    content: optimizedContent,
    hashtags,
    characterCount,
    isWithinLimit,
    imageSpecs: {
      width: config.imageWidth,
      height: config.imageHeight,
      aspectRatio: config.aspectRatio,
    },
    warnings,
  };
}

/**
 * Optimize content for all selected platforms
 */
export function optimizeForAllPlatforms(
  article: {
    title: string;
    description: string;
    content: string;
    category: string;
  },
  platforms: string[]
): Record<string, OptimizedContent> {
  const results: Record<string, OptimizedContent> = {};

  for (const platformId of platforms) {
    if (platformId === 'all') continue; // Skip the 'all' pseudo-platform
    try {
      results[platformId] = optimizeForPlatform(article, platformId);
    } catch {
      console.error(`Failed to optimize for platform: ${platformId}`);
    }
  }

  return results;
}

/**
 * Strip MDX/Markdown formatting to get plain text
 */
function stripMdx(content: string): string {
  return content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate an excerpt optimized for the platform's character limit
 */
function generateExcerpt(text: string, config: PlatformConfig): string {
  // Reserve space for title, hashtags, and formatting
  const reservedChars = 300;
  const maxExcerptLength = Math.min(config.maxCharacters - reservedChars, 500);

  if (text.length <= maxExcerptLength) {
    return text;
  }

  // Find a good break point (end of sentence)
  let excerpt = text.substring(0, maxExcerptLength);
  const lastPeriod = excerpt.lastIndexOf('.');
  const lastQuestion = excerpt.lastIndexOf('?');
  const lastExclamation = excerpt.lastIndexOf('!');
  const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclamation);

  if (breakPoint > maxExcerptLength * 0.5) {
    excerpt = text.substring(0, breakPoint + 1);
  } else {
    // Fall back to word boundary
    const lastSpace = excerpt.lastIndexOf(' ');
    if (lastSpace > 0) {
      excerpt = text.substring(0, lastSpace) + '...';
    }
  }

  return excerpt.trim();
}

/**
 * Generate relevant hashtags based on category and content
 */
function generateHashtags(category: string, content: string, limit: number): string[] {
  const categoryHashtags: Record<string, string[]> = {
    'for-clients': ['#tutoring', '#learning', '#education', '#students'],
    'for-tutors': ['#tutoring', '#teacherlife', '#edtech', '#tutorlife'],
    'for-agents': ['#edutech', '#tutoring', '#business', '#partnership'],
    'for-organisations': ['#corporate', '#training', '#learning', '#education'],
    'getting-started': ['#howto', '#guide', '#tutorial', '#getstarted'],
    faqs: ['#faq', '#help', '#support', '#questions'],
    'best-practices': ['#bestpractices', '#tips', '#productivity', '#success'],
    'success-stories': ['#success', '#testimonial', '#inspiration', '#achievement'],
    'product-updates': ['#productnews', '#updates', '#features', '#edtech'],
    'pricing-billing': ['#pricing', '#value', '#education', '#investment'],
    'safety-trust': ['#safety', '#trust', '#security', '#online'],
    'education-insights': ['#education', '#learning', '#insights', '#research'],
    'content-marketing': ['#contentmarketing', '#marketing', '#education'],
    'about-tutorwise': ['#tutorwise', '#aboutus', '#edtech'],
    'company-news': ['#companynews', '#announcement', '#tutorwise'],
  };

  // Start with category-based hashtags
  const hashtags = [...(categoryHashtags[category] || ['#education', '#learning'])];

  // Add Tutorwise brand hashtag
  if (!hashtags.includes('#tutorwise')) {
    hashtags.push('#tutorwise');
  }

  // Extract potential hashtags from content (capitalized words, key terms)
  const contentWords = content
    .toLowerCase()
    .match(/\b[a-z]{4,}\b/g)
    ?.filter((word) => !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'your'].includes(word));

  if (contentWords) {
    const wordFreq: Record<string, number> = {};
    for (const word of contentWords) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    // Add top frequent words as hashtags
    const topWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([word]) => `#${word}`);

    for (const tag of topWords) {
      if (!hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    }
  }

  return hashtags.slice(0, limit);
}

/**
 * Optimize title for specific platform
 */
function optimizeTitle(title: string, platformId: string): string {
  switch (platformId) {
    case 'linkedin':
      // LinkedIn prefers professional, value-focused titles
      return title;
    case 'facebook':
      // Facebook works well with engaging, question-based titles
      if (!title.endsWith('?') && !title.endsWith('!')) {
        return title;
      }
      return title;
    case 'instagram':
      // Instagram prefers shorter, punchy titles
      if (title.length > 60) {
        const shortened = title.substring(0, 57);
        const lastSpace = shortened.lastIndexOf(' ');
        return lastSpace > 30 ? shortened.substring(0, lastSpace) + '...' : shortened + '...';
      }
      return title;
    default:
      return title;
  }
}

/**
 * Build LinkedIn-optimized post content
 */
function buildLinkedInContent(title: string, excerpt: string, hashtags: string[]): string {
  const hashtagStr = hashtags.slice(0, 5).join(' ');

  return `${title}

${excerpt}

${hashtagStr}

---
Read more on Tutorwise Resources`;
}

/**
 * Build Facebook-optimized post content
 */
function buildFacebookContent(title: string, excerpt: string, hashtags: string[]): string {
  const hashtagStr = hashtags.slice(0, 10).join(' ');

  return `${title}

${excerpt}

${hashtagStr}`;
}

/**
 * Build Instagram-optimized caption
 */
function buildInstagramContent(title: string, excerpt: string, hashtags: string[]): string {
  const hashtagStr = hashtags.join(' ');

  return `${title}

${excerpt}

.
.
.
${hashtagStr}`;
}

/**
 * Get recommended image dimensions for a platform
 */
export function getImageDimensions(platformId: string): { width: number; height: number } {
  const config = PLATFORM_CONFIGS[platformId];
  return config
    ? { width: config.imageWidth, height: config.imageHeight }
    : { width: 1200, height: 630 };
}

/**
 * Validate if content fits within platform limits
 */
export function validateContentForPlatform(
  content: string,
  platformId: string
): { valid: boolean; message: string } {
  const config = PLATFORM_CONFIGS[platformId];
  if (!config) {
    return { valid: false, message: 'Unknown platform' };
  }

  if (content.length <= config.maxCharacters) {
    return { valid: true, message: `${content.length}/${config.maxCharacters} characters` };
  }

  return {
    valid: false,
    message: `Exceeds limit by ${content.length - config.maxCharacters} characters`,
  };
}
