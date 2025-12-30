/**
 * Filename: src/services/seo/content-quality.ts
 * Purpose: Content quality scoring for SEO optimization
 * Created: 2025-12-29
 *
 * Scores content based on:
 * - Word count (length)
 * - Readability (Flesch Reading Ease)
 * - Keyword optimization
 * - Structure (headings, lists, etc.)
 * - Internal/external links
 *
 * Works WITHOUT external services - all calculations are local
 */

import { createClient } from '@/utils/supabase/server';

interface ContentAnalysis {
  wordCount: number;
  readabilityScore: number; // Flesch Reading Ease (0-100)
  seoScore: number; // Overall SEO score (0-100)
  keywordDensity: number; // Percentage
  headingsCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesCount: number;
  issues: QualityIssue[];
  recommendations: string[];
}

interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'length' | 'readability' | 'keywords' | 'structure' | 'links' | 'metadata';
  message: string;
  fix?: string;
}

/**
 * Calculate word count (excluding HTML tags)
 */
function countWords(text: string): number {
  // Remove HTML tags
  const stripped = text.replace(/<[^>]*>/g, ' ');
  // Remove extra whitespace and count words
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Calculate syllables in a word (approximate)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;

  // Remove non-letters
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

/**
 * Calculate Flesch Reading Ease Score
 * Score: 0-100 (higher = easier to read)
 * Target: 60-70 for general audience
 * Formula: 206.835 - 1.015(total words/total sentences) - 84.6(total syllables/total words)
 */
function calculateReadability(text: string): number {
  // Remove HTML tags
  const stripped = text.replace(/<[^>]*>/g, ' ');

  // Count sentences (approximate: split by . ! ?)
  const sentences = stripped.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Count words
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;

  // Count syllables
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  // Calculate Flesch Reading Ease
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;

  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate keyword density
 */
function calculateKeywordDensity(content: string, keyword: string): number {
  const stripped = content.replace(/<[^>]*>/g, ' ').toLowerCase();
  const words = stripped.split(/\s+/).filter(Boolean);
  const totalWords = words.length || 1;

  // Count keyword occurrences (case-insensitive, whole word)
  const keywordLower = keyword.toLowerCase();
  const keywordWords = keywordLower.split(/\s+/);
  let keywordCount = 0;

  // Simple whole-keyword matching
  if (keywordWords.length === 1) {
    keywordCount = words.filter((w) => w === keywordLower).length;
  } else {
    // Multi-word keyword
    const keywordPhrase = keywordWords.join(' ');
    const text = words.join(' ');
    const regex = new RegExp(`\\b${keywordPhrase}\\b`, 'gi');
    const matches = text.match(regex);
    keywordCount = matches ? matches.length : 0;
  }

  return (keywordCount / totalWords) * 100;
}

/**
 * Count HTML elements (headings, links, images)
 */
function countStructureElements(content: string): {
  headings: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
} {
  const headings = (content.match(/<h[1-6][^>]*>/gi) || []).length;
  const images = (content.match(/<img[^>]*>/gi) || []).length;

  // Count links
  const linkMatches = content.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) || [];
  let internalLinks = 0;
  let externalLinks = 0;

  linkMatches.forEach((link) => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      const href = hrefMatch[1];
      // Internal link if starts with / or #, or contains tutorwise.io
      if (href.startsWith('/') || href.startsWith('#') || href.includes('tutorwise.io')) {
        internalLinks++;
      } else if (href.startsWith('http')) {
        externalLinks++;
      }
    }
  });

  return { headings, internalLinks, externalLinks, images };
}

/**
 * Check if keyword appears in title
 */
function keywordInTitle(title: string, keyword: string): boolean {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * Check if keyword appears in first 100 words
 */
function keywordInIntro(content: string, keyword: string): boolean {
  const stripped = content.replace(/<[^>]*>/g, ' ').toLowerCase();
  const words = stripped.split(/\s+/).filter(Boolean);
  const first100 = words.slice(0, 100).join(' ');
  return first100.includes(keyword.toLowerCase());
}

/**
 * Analyze content quality
 */
export async function analyzeContentQuality(
  content: string,
  title: string,
  metaDescription: string | null,
  keyword: string | null,
  contentType: 'hub' | 'spoke'
): Promise<ContentAnalysis> {
  const wordCount = countWords(content);
  const readabilityScore = calculateReadability(content);
  const structure = countStructureElements(content);

  const issues: QualityIssue[] = [];
  const recommendations: string[] = [];

  // Minimum word count requirements
  const minWords = contentType === 'hub' ? 1500 : 800;
  const targetWords = contentType === 'hub' ? 2000 : 1200;

  if (wordCount < minWords) {
    issues.push({
      severity: 'error',
      category: 'length',
      message: `Content too short (${wordCount} words). Minimum: ${minWords} words.`,
      fix: `Add ${minWords - wordCount} more words to meet minimum requirements.`,
    });
  } else if (wordCount < targetWords) {
    issues.push({
      severity: 'warning',
      category: 'length',
      message: `Content below target (${wordCount} words). Target: ${targetWords} words.`,
      fix: `Add ${targetWords - wordCount} more words for optimal length.`,
    });
  }

  // Readability check (target: 60-70)
  if (readabilityScore < 50) {
    issues.push({
      severity: 'warning',
      category: 'readability',
      message: `Content is difficult to read (score: ${readabilityScore}). Target: 60-70.`,
      fix: 'Use shorter sentences and simpler words to improve readability.',
    });
    recommendations.push('Break up long sentences (aim for 15-20 words per sentence)');
    recommendations.push('Replace complex words with simpler alternatives');
  } else if (readabilityScore > 80) {
    issues.push({
      severity: 'info',
      category: 'readability',
      message: `Content may be too simple (score: ${readabilityScore}). Target: 60-70.`,
      fix: 'Add more depth and technical detail where appropriate.',
    });
  }

  // Keyword optimization (if keyword provided)
  let keywordDensity = 0;
  if (keyword) {
    keywordDensity = calculateKeywordDensity(content, keyword);

    // Target keyword density: 1-2%
    if (keywordDensity < 0.5) {
      issues.push({
        severity: 'warning',
        category: 'keywords',
        message: `Low keyword density (${keywordDensity.toFixed(2)}%). Target: 1-2%.`,
        fix: `Add ${Math.ceil((0.01 * wordCount - keywordDensity * wordCount) / 100)} more instances of "${keyword}".`,
      });
    } else if (keywordDensity > 3) {
      issues.push({
        severity: 'warning',
        category: 'keywords',
        message: `Keyword stuffing detected (${keywordDensity.toFixed(2)}%). Target: 1-2%.`,
        fix: `Remove some instances of "${keyword}" to avoid over-optimization.`,
      });
    }

    // Keyword in title
    if (!keywordInTitle(title, keyword)) {
      issues.push({
        severity: 'error',
        category: 'keywords',
        message: `Primary keyword "${keyword}" not found in title.`,
        fix: 'Add primary keyword to the beginning of the title.',
      });
    }

    // Keyword in intro
    if (!keywordInIntro(content, keyword)) {
      issues.push({
        severity: 'warning',
        category: 'keywords',
        message: `Primary keyword "${keyword}" not found in first 100 words.`,
        fix: 'Mention the primary keyword early in the introduction.',
      });
    }
  }

  // Structure checks
  if (structure.headings < 3) {
    issues.push({
      severity: 'warning',
      category: 'structure',
      message: `Too few headings (${structure.headings}). Minimum: 3.`,
      fix: 'Add more H2 and H3 headings to improve content structure.',
    });
    recommendations.push('Use descriptive headings to break up content');
  }

  if (structure.internalLinks < 3) {
    issues.push({
      severity: 'warning',
      category: 'links',
      message: `Too few internal links (${structure.internalLinks}). Minimum: 3.`,
      fix: 'Add links to related content on your site.',
    });
    recommendations.push('Link to related hubs, spokes, or product pages');
  }

  if (structure.externalLinks < 2) {
    issues.push({
      severity: 'info',
      category: 'links',
      message: `Few external citations (${structure.externalLinks}). Recommended: 3+.`,
      fix: 'Add authoritative external sources to support claims.',
    });
    recommendations.push('Cite research, statistics, and expert sources');
  }

  // Meta description
  if (!metaDescription || metaDescription.length < 120) {
    issues.push({
      severity: 'error',
      category: 'metadata',
      message: 'Meta description too short or missing. Target: 150-160 characters.',
      fix: 'Write a compelling 150-160 character meta description.',
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      severity: 'warning',
      category: 'metadata',
      message: 'Meta description too long. It will be truncated in search results.',
      fix: 'Shorten meta description to 150-160 characters.',
    });
  }

  // Calculate overall SEO score (0-100)
  let seoScore = 100;

  // Deduct points for issues
  issues.forEach((issue) => {
    if (issue.severity === 'error') seoScore -= 10;
    if (issue.severity === 'warning') seoScore -= 5;
    if (issue.severity === 'info') seoScore -= 2;
  });

  // Bonus points for good metrics
  if (wordCount >= targetWords) seoScore += 5;
  if (readabilityScore >= 60 && readabilityScore <= 70) seoScore += 5;
  if (keywordDensity >= 1 && keywordDensity <= 2) seoScore += 5;
  if (structure.headings >= 5) seoScore += 3;
  if (structure.internalLinks >= 5) seoScore += 3;
  if (structure.externalLinks >= 3) seoScore += 2;

  seoScore = Math.max(0, Math.min(100, seoScore));

  // General recommendations
  if (recommendations.length === 0 && seoScore >= 80) {
    recommendations.push('Content quality is good! Consider adding more images or examples.');
  }

  return {
    wordCount,
    readabilityScore,
    seoScore,
    keywordDensity,
    headingsCount: structure.headings,
    internalLinksCount: structure.internalLinks,
    externalLinksCount: structure.externalLinks,
    imagesCount: structure.images,
    issues,
    recommendations,
  };
}

/**
 * Update hub/spoke with quality metrics
 */
export async function updateContentQuality(
  contentId: string,
  contentType: 'hub' | 'spoke',
  analysis: ContentAnalysis
): Promise<void> {
  const supabase = await createClient();

  const table = contentType === 'hub' ? 'seo_hubs' : 'seo_spokes';

  // Determine quality status based on SEO score
  let qualityStatus: string;
  if (analysis.seoScore >= 80) qualityStatus = 'excellent';
  else if (analysis.seoScore >= 60) qualityStatus = 'good';
  else if (analysis.seoScore >= 40) qualityStatus = 'needs_improvement';
  else qualityStatus = 'poor';

  await supabase
    .from(table)
    .update({
      word_count: analysis.wordCount,
      readability_score: analysis.readabilityScore,
      seo_score: analysis.seoScore,
      content_quality_status: qualityStatus,
      quality_issues: analysis.issues,
      internal_links_count: analysis.internalLinksCount,
      last_edited_at: new Date().toISOString(),
    })
    .eq('id', contentId);
}

/**
 * Analyze and update all published content
 */
export async function analyzeAllContent(): Promise<{ analyzed: number; updated: number }> {
  const supabase = await createClient();

  let analyzed = 0;
  let updated = 0;

  // Analyze hubs
  const { data: hubs } = await supabase
    .from('seo_hubs')
    .select('id, title, content, meta_description, target_keyword_id')
    .eq('status', 'published');

  if (hubs) {
    for (const hub of hubs) {
      // Get target keyword
      let keyword = null;
      if (hub.target_keyword_id) {
        const { data: kwData } = await supabase
          .from('seo_keywords')
          .select('keyword')
          .eq('id', hub.target_keyword_id)
          .single();
        keyword = kwData?.keyword || null;
      }

      const analysis = await analyzeContentQuality(
        hub.content || '',
        hub.title,
        hub.meta_description,
        keyword,
        'hub'
      );

      await updateContentQuality(hub.id, 'hub', analysis);
      analyzed++;
      updated++;
    }
  }

  // Analyze spokes
  const { data: spokes } = await supabase
    .from('seo_spokes')
    .select('id, title, content, meta_description, target_keyword_id')
    .eq('status', 'published');

  if (spokes) {
    for (const spoke of spokes) {
      // Get target keyword
      let keyword = null;
      if (spoke.target_keyword_id) {
        const { data: kwData } = await supabase
          .from('seo_keywords')
          .select('keyword')
          .eq('id', spoke.target_keyword_id)
          .single();
        keyword = kwData?.keyword || null;
      }

      const analysis = await analyzeContentQuality(
        spoke.content || '',
        spoke.title,
        spoke.meta_description,
        keyword,
        'spoke'
      );

      await updateContentQuality(spoke.id, 'spoke', analysis);
      analyzed++;
      updated++;
    }
  }

  return { analyzed, updated };
}
