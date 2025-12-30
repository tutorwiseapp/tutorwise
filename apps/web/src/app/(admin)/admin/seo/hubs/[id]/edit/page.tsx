/*
 * Filename: src/app/(admin)/admin/seo/hubs/[id]/edit/page.tsx
 * Purpose: Hub content editor with real-time SEO quality feedback
 * Created: 2025-12-29
 * Goal: Create/edit SEO-optimized hub content with live scoring
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import {
  Save,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Target,
  TrendingUp,
} from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface Hub {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  target_keyword_id: string | null;
  status: string;
  word_count: number;
  readability_score: number | null;
  seo_score: number | null;
  content_quality_status: string | null;
  quality_issues: QualityIssue[];
}

interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  fix?: string;
}

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
}

export default function HubEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const canUpdate = usePermission('seo', 'update');

  const hubId = params.id as string;
  const isNew = hubId === 'new';

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [targetKeywordId, setTargetKeywordId] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Quality metrics (calculated client-side for real-time feedback)
  const [wordCount, setWordCount] = useState(0);
  const [readabilityScore, setReadabilityScore] = useState(0);
  const [seoScore, setSeoScore] = useState(0);
  const [issues, setIssues] = useState<QualityIssue[]>([]);

  // Fetch hub data (if editing)
  const { data: hub, isLoading: hubLoading } = useQuery({
    queryKey: ['admin', 'seo-hub', hubId],
    queryFn: async () => {
      if (isNew) return null;

      const { data, error } = await supabase.from('seo_hubs').select('*').eq('id', hubId).single();

      if (error) throw error;
      return data as Hub;
    },
    enabled: !isNew,
  });

  // Fetch keywords for dropdown
  const { data: keywords } = useQuery({
    queryKey: ['admin', 'seo-keywords-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('id, keyword, search_volume, keyword_difficulty')
        .order('priority', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Keyword[];
    },
  });

  // Populate form when hub loads
  useEffect(() => {
    if (hub) {
      setTitle(hub.title);
      setSlug(hub.slug);
      setContent(hub.content || '');
      setMetaTitle(hub.meta_title || '');
      setMetaDescription(hub.meta_description || '');
      setTargetKeywordId(hub.target_keyword_id);
      setStatus(hub.status as 'draft' | 'published');
    }
  }, [hub]);

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew && title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, slug, isNew]);

  // Calculate quality metrics in real-time
  useEffect(() => {
    const calculateMetrics = () => {
      // Word count
      const stripped = content.replace(/<[^>]*>/g, ' ');
      const words = stripped.trim().split(/\s+/).filter(Boolean);
      const count = words.length;
      setWordCount(count);

      // Simple readability (Flesch approximation)
      const sentences = stripped.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const sentenceCount = sentences.length || 1;
      const avgWordsPerSentence = count / sentenceCount;
      const readability = Math.max(0, Math.min(100, Math.round(100 - avgWordsPerSentence * 2)));
      setReadabilityScore(readability);

      // SEO score and issues
      const newIssues: QualityIssue[] = [];
      let score = 100;

      // Word count check
      if (count < 1500) {
        newIssues.push({
          severity: 'error',
          category: 'length',
          message: `Content too short (${count} words). Minimum: 1500 words for hubs.`,
          fix: `Add ${1500 - count} more words.`,
        });
        score -= 15;
      }

      // Meta description check
      if (!metaDescription || metaDescription.length < 120) {
        newIssues.push({
          severity: 'error',
          category: 'metadata',
          message: 'Meta description too short or missing. Target: 150-160 characters.',
          fix: 'Write a compelling 150-160 character meta description.',
        });
        score -= 10;
      } else if (metaDescription.length > 160) {
        newIssues.push({
          severity: 'warning',
          category: 'metadata',
          message: 'Meta description too long. Will be truncated in search results.',
          fix: 'Shorten to 150-160 characters.',
        });
        score -= 5;
      }

      // Title check
      if (!title || title.length < 30) {
        newIssues.push({
          severity: 'warning',
          category: 'metadata',
          message: 'Title too short. Target: 50-60 characters.',
          fix: 'Expand title to include primary keyword and value proposition.',
        });
        score -= 5;
      } else if (title.length > 60) {
        newIssues.push({
          severity: 'info',
          category: 'metadata',
          message: 'Title may be truncated in search results.',
          fix: 'Shorten to 50-60 characters.',
        });
        score -= 2;
      }

      // Headings check
      const headings = (content.match(/<h[1-6][^>]*>/gi) || []).length;
      if (headings < 3) {
        newIssues.push({
          severity: 'warning',
          category: 'structure',
          message: `Too few headings (${headings}). Minimum: 3.`,
          fix: 'Add more H2 and H3 headings to improve structure.',
        });
        score -= 5;
      }

      // Internal links check
      const internalLinks = (content.match(/<a[^>]+href=["'][/][^"']*["']/gi) || []).length;
      if (internalLinks < 3) {
        newIssues.push({
          severity: 'warning',
          category: 'links',
          message: `Too few internal links (${internalLinks}). Minimum: 3.`,
          fix: 'Add links to related content.',
        });
        score -= 5;
      }

      // Readability check
      if (readability < 50) {
        newIssues.push({
          severity: 'warning',
          category: 'readability',
          message: `Content difficult to read (score: ${readability}). Target: 60-70.`,
          fix: 'Use shorter sentences and simpler words.',
        });
        score -= 5;
      }

      setIssues(newIssues);
      setSeoScore(Math.max(0, score));
    };

    const debounce = setTimeout(calculateMetrics, 500);
    return () => clearTimeout(debounce);
  }, [content, title, metaDescription]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const hubData = {
        title,
        slug,
        content,
        meta_title: metaTitle || title,
        meta_description: metaDescription,
        target_keyword_id: targetKeywordId,
        status,
        word_count: wordCount,
        readability_score: readabilityScore,
        seo_score: seoScore,
        quality_issues: issues,
        last_edited_at: new Date().toISOString(),
      };

      if (isNew) {
        const { data, error } = await supabase.from('seo_hubs').insert(hubData).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('seo_hubs')
          .update(hubData)
          .eq('id', hubId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo-hubs'] });
      if (isNew) {
        router.push(`/admin/seo/hubs/${data.id}/edit`);
      }
    },
  });

  const handleSave = () => {
    if (!canUpdate) return;
    saveMutation.mutate();
  };

  const handlePublish = () => {
    if (!canUpdate) return;
    setStatus('published');
    setTimeout(() => saveMutation.mutate(), 100);
  };

  // Get selected keyword
  const selectedKeyword = keywords?.find((k) => k.id === targetKeywordId);

  // SEO score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return styles.scoreGreen;
    if (score >= 60) return styles.scoreYellow;
    return styles.scoreRed;
  };

  // Issue severity icon
  const getIssueIcon = (severity: string) => {
    if (severity === 'error') return <AlertTriangle className={styles.iconError} />;
    if (severity === 'warning') return <AlertTriangle className={styles.iconWarning} />;
    return <Info className={styles.iconInfo} />;
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title={isNew ? 'Create New Hub' : 'Edit Hub'}
          subtitle={isNew ? 'Create SEO-optimized pillar content' : `Editing: ${hub?.title || ''}`}
          actions={
            <div className={styles.headerActions}>
              <Button variant="secondary" onClick={() => router.push('/admin/seo/hubs')}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleSave} disabled={!canUpdate || saveMutation.isPending}>
                <Save className={styles.buttonIcon} />
                Save Draft
              </Button>
              <Button onClick={handlePublish} disabled={!canUpdate || saveMutation.isPending || seoScore < 60}>
                <Eye className={styles.buttonIcon} />
                Publish
              </Button>
            </div>
          }
        />
      }
      sidebar={
        <HubSidebar>
          {/* SEO Score */}
          <div className={styles.scoreWidget}>
            <div className={styles.scoreHeader}>
              <Target className={styles.scoreIcon} />
              <span>SEO Score</span>
            </div>
            <div className={`${styles.scoreValue} ${getScoreColor(seoScore)}`}>{seoScore}/100</div>
            <div className={styles.scoreBar}>
              <div className={styles.scoreProgress} style={{ width: `${seoScore}%` }}></div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className={styles.metricsWidget}>
            <h3 className={styles.widgetTitle}>Quality Metrics</h3>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Word Count:</span>
              <span className={wordCount >= 1500 ? styles.metricGood : styles.metricBad}>
                {wordCount} / 1500
              </span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Readability:</span>
              <span className={readabilityScore >= 60 ? styles.metricGood : styles.metricBad}>
                {readabilityScore}/100
              </span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Meta Desc:</span>
              <span className={metaDescription.length >= 150 ? styles.metricGood : styles.metricBad}>
                {metaDescription.length} / 160
              </span>
            </div>
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div className={styles.issuesWidget}>
              <h3 className={styles.widgetTitle}>Issues ({issues.length})</h3>
              {issues.slice(0, 5).map((issue, idx) => (
                <div key={idx} className={styles.issueItem}>
                  {getIssueIcon(issue.severity)}
                  <div className={styles.issueContent}>
                    <div className={styles.issueMessage}>{issue.message}</div>
                    {issue.fix && <div className={styles.issueFix}>{issue.fix}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Keyword */}
          {selectedKeyword && (
            <div className={styles.keywordWidget}>
              <h3 className={styles.widgetTitle}>Target Keyword</h3>
              <div className={styles.keywordInfo}>
                <div className={styles.keywordText}>{selectedKeyword.keyword}</div>
                <div className={styles.keywordMeta}>
                  <span>Vol: {selectedKeyword.search_volume?.toLocaleString()}</span>
                  <span>•</span>
                  <span>KD: {selectedKeyword.keyword_difficulty}</span>
                </div>
              </div>
            </div>
          )}
        </HubSidebar>
      }
    >
      <div className={styles.editorContainer}>
        {/* Basic Info */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Information</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder="Enter hub title (50-60 characters recommended)"
              maxLength={100}
            />
            <span className={styles.charCount}>{title.length}/60</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>URL Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={styles.input}
              placeholder="url-friendly-slug"
            />
            <span className={styles.helpText}>Will appear as: /guides/{slug}</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Target Keyword</label>
            <select
              value={targetKeywordId || ''}
              onChange={(e) => setTargetKeywordId(e.target.value || null)}
              className={styles.select}
            >
              <option value="">Select a target keyword...</option>
              {keywords?.map((kw) => (
                <option key={kw.id} value={kw.id}>
                  {kw.keyword} (Vol: {kw.search_volume?.toLocaleString()}, KD: {kw.keyword_difficulty})
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Content */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Content</h2>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.contentEditor}
            placeholder="Write your SEO-optimized content here... (Minimum 1500 words for hubs)"
            rows={20}
          />
          <span className={styles.helpText}>
            Use HTML tags for formatting: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;a&gt;, &lt;ul&gt;, &lt;li&gt;
          </span>
        </section>

        {/* SEO Metadata */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>SEO Metadata</h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Meta Title</label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className={styles.input}
              placeholder="Leave empty to use page title"
              maxLength={60}
            />
            <span className={styles.charCount}>{metaTitle.length}/60</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Meta Description *</label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Write a compelling meta description (150-160 characters)"
              rows={3}
              maxLength={160}
            />
            <span className={styles.charCount}>{metaDescription.length}/160</span>
          </div>
        </section>
      </div>
    </HubPageLayout>
  );
}
