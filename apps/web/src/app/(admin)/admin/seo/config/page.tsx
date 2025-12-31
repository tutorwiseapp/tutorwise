/*
 * Filename: src/app/(admin)/admin/seo/config/page.tsx
 * Purpose: SEO Configuration page for admins
 * Created: 2025-12-23
 * Updated: 2025-12-29 - Added full configuration with real data integration
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { HubForm } from '@/app/components/hub/form/HubForm';
import HubToggle from '@/app/components/hub/form/HubToggle';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Save } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminSeoConfigPage() {
  const router = useRouter();
  const canUpdate = usePermission('seo', 'update');
  const [activeTab, setActiveTab] = useState<'general' | 'advanced'>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Meta Defaults
    metaTitleTemplate: '',
    metaDescriptionTemplate: '',
    ogImageUrl: '',
    ogType: 'website',

    // URL Patterns
    hubUrlPattern: '',
    spokeUrlPattern: '',
    canonicalBaseUrl: '',

    // Schema Markup
    enableSchemaMarkup: true,
    defaultHubSchemaType: '',
    defaultSpokeSchemaType: '',

    // Sitemap
    enableSitemap: true,
    updateFrequency: 'daily',
    priorityHubs: 0.8,
    prioritySpokes: 0.6,

    // Robots.txt
    enableRobotsTxt: true,
    allowSearchIndexing: true,
    crawlDelaySeconds: 0,

    // Performance
    enableImageLazyLoading: true,
    enableCdn: false,
    cdnBaseUrl: '',
    cacheTtlMinutes: 60,

    // Analytics
    enableGoogleSearchConsole: false,
    googleSearchConsolePropertyUrl: '',
    googleAnalyticsId: '',
    trackInternalLinks: true,

    // Content Settings
    minHubWordCount: 500,
    minSpokeWordCount: 300,
    autoGenerateMetaDescriptions: false,
    autoInternalLinking: true,
  });

  // Fetch SEO configuration from API on mount
  useEffect(() => {
    async function fetchSeoConfig() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/seo/config');

        if (!response.ok) {
          throw new Error('Failed to fetch SEO config');
        }

        const config = await response.json();

        setFormData({
          metaTitleTemplate: config.metaDefaults.metaTitleTemplate,
          metaDescriptionTemplate: config.metaDefaults.metaDescriptionTemplate,
          ogImageUrl: config.metaDefaults.ogImageUrl,
          ogType: config.metaDefaults.ogType,
          hubUrlPattern: config.urlPatterns.hubUrlPattern,
          spokeUrlPattern: config.urlPatterns.spokeUrlPattern,
          canonicalBaseUrl: config.urlPatterns.canonicalBaseUrl,
          enableSchemaMarkup: config.schemaMarkup.enableSchemaMarkup,
          defaultHubSchemaType: config.schemaMarkup.defaultHubSchemaType,
          defaultSpokeSchemaType: config.schemaMarkup.defaultSpokeSchemaType,
          enableSitemap: config.sitemap.enableSitemap,
          updateFrequency: config.sitemap.updateFrequency,
          priorityHubs: config.sitemap.priorityHubs,
          prioritySpokes: config.sitemap.prioritySpokes,
          enableRobotsTxt: config.robotsTxt.enableRobotsTxt,
          allowSearchIndexing: config.robotsTxt.allowSearchIndexing,
          crawlDelaySeconds: config.robotsTxt.crawlDelaySeconds,
          enableImageLazyLoading: config.performance.enableImageLazyLoading,
          enableCdn: config.performance.enableCdn,
          cdnBaseUrl: config.performance.cdnBaseUrl,
          cacheTtlMinutes: config.performance.cacheTtlMinutes,
          enableGoogleSearchConsole: config.analytics.enableGoogleSearchConsole,
          googleSearchConsolePropertyUrl: config.analytics.googleSearchConsolePropertyUrl,
          googleAnalyticsId: config.analytics.googleAnalyticsId,
          trackInternalLinks: config.analytics.trackInternalLinks,
          minHubWordCount: config.contentSettings.minHubWordCount,
          minSpokeWordCount: config.contentSettings.minSpokeWordCount,
          autoGenerateMetaDescriptions: config.contentSettings.autoGenerateMetaDescriptions,
          autoInternalLinking: config.contentSettings.autoInternalLinking,
        });
      } catch (error) {
        alert('Failed to load SEO configuration. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSeoConfig();
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.metaTitleTemplate.trim()) {
      newErrors.metaTitleTemplate = 'Meta title template is required';
    }

    if (!formData.canonicalBaseUrl.trim()) {
      newErrors.canonicalBaseUrl = 'Canonical base URL is required';
    }

    if (formData.priorityHubs < 0 || formData.priorityHubs > 1) {
      newErrors.priorityHubs = 'Priority must be between 0 and 1';
    }

    if (formData.prioritySpokes < 0 || formData.prioritySpokes > 1) {
      newErrors.prioritySpokes = 'Priority must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);

      const response = await fetch('/api/admin/seo/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaDefaults: {
            metaTitleTemplate: formData.metaTitleTemplate,
            metaDescriptionTemplate: formData.metaDescriptionTemplate,
            ogImageUrl: formData.ogImageUrl,
            ogType: formData.ogType,
          },
          urlPatterns: {
            hubUrlPattern: formData.hubUrlPattern,
            spokeUrlPattern: formData.spokeUrlPattern,
            canonicalBaseUrl: formData.canonicalBaseUrl,
          },
          schemaMarkup: {
            enableSchemaMarkup: formData.enableSchemaMarkup,
            defaultHubSchemaType: formData.defaultHubSchemaType,
            defaultSpokeSchemaType: formData.defaultSpokeSchemaType,
            organizationSchema: {}, // TODO: Make editable
          },
          sitemap: {
            enableSitemap: formData.enableSitemap,
            updateFrequency: formData.updateFrequency,
            priorityHubs: formData.priorityHubs,
            prioritySpokes: formData.prioritySpokes,
          },
          robotsTxt: {
            enableRobotsTxt: formData.enableRobotsTxt,
            allowSearchIndexing: formData.allowSearchIndexing,
            crawlDelaySeconds: formData.crawlDelaySeconds,
          },
          performance: {
            enableImageLazyLoading: formData.enableImageLazyLoading,
            enableCdn: formData.enableCdn,
            cdnBaseUrl: formData.cdnBaseUrl,
            cacheTtlMinutes: formData.cacheTtlMinutes,
          },
          analytics: {
            enableGoogleSearchConsole: formData.enableGoogleSearchConsole,
            googleSearchConsolePropertyUrl: formData.googleSearchConsolePropertyUrl,
            googleAnalyticsId: formData.googleAnalyticsId,
            trackInternalLinks: formData.trackInternalLinks,
          },
          contentSettings: {
            minHubWordCount: formData.minHubWordCount,
            minSpokeWordCount: formData.minSpokeWordCount,
            autoGenerateMetaDescriptions: formData.autoGenerateMetaDescriptions,
            autoInternalLinking: formData.autoInternalLinking,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save SEO configuration');
      }

      setHasUnsavedChanges(false);
      alert('SEO configuration saved successfully!');
    } catch (error) {
      alert('Failed to save SEO configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    if (hasUnsavedChanges) {
      const confirmLeave = confirm('You have unsaved changes. Do you want to leave without saving?');
      if (!confirmLeave) return;
    }
    setActiveTab(tabId as 'general' | 'advanced');
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Configuration"
          subtitle="Configure SEO settings and preferences"
          className={styles.configHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'general', label: 'General', active: activeTab === 'general' },
            { id: 'advanced', label: 'Advanced', active: activeTab === 'advanced' }
          ]}
          onTabChange={handleTabChange}
          className={styles.configTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Configuration Status"
            stats={[
              { label: 'Schema Markup', value: formData.enableSchemaMarkup ? 'Enabled' : 'Disabled' },
              { label: 'Sitemap', value: formData.enableSitemap ? 'Enabled' : 'Disabled' },
              { label: 'Search Console', value: formData.enableGoogleSearchConsole ? 'Connected' : 'Not Connected' },
            ]}
          />
          <AdminHelpWidget
            title="SEO Configuration Help"
            items={[
              { question: 'What is a meta title template?', answer: 'A template that defines the format for page titles. Use {page_title} as a placeholder for dynamic content.' },
              { question: 'What is canonical URL?', answer: 'The preferred URL for your content to avoid duplicate content issues in search engines.' },
              { question: 'What is schema markup?', answer: 'Structured data that helps search engines understand your content better and display rich results.' },
            ]}
          />
          <AdminTipWidget
            title="SEO Tips"
            tips={[
              'Keep meta titles under 60 characters',
              'Meta descriptions should be 150-160 characters',
              'Use descriptive URL patterns',
              'Enable schema markup for better search visibility',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* General Tab */}
      {activeTab === 'general' && (
        <div className={styles.configContent}>
          {/* Meta Defaults Section */}
          <HubForm.Section
            title="Meta Defaults"
          >
            <HubForm.Field
              label="Meta Title Template"
              error={errors.metaTitleTemplate}
              required
            >
              <input
                type="text"
                value={formData.metaTitleTemplate}
                onChange={(e) => handleChange('metaTitleTemplate', e.target.value)}
                placeholder="{page_title} | Tutorwise"
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Meta Description Template"
            >
              <textarea
                value={formData.metaDescriptionTemplate}
                onChange={(e) => handleChange('metaDescriptionTemplate', e.target.value)}
                placeholder="Find expert tutors on Tutorwise. {page_description}"
                rows={3}
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Default OG Image URL"
            >
              <input
                type="url"
                value={formData.ogImageUrl}
                onChange={(e) => handleChange('ogImageUrl', e.target.value)}
                placeholder="https://tutorwise.io/og-image.jpg"
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubForm.Field
              label="OG Type"
            >
              <select
                value={formData.ogType}
                onChange={(e) => handleChange('ogType', e.target.value)}
                disabled={isLoading || !canUpdate}
              >
                <option value="website">Website</option>
                <option value="article">Article</option>
              </select>
            </HubForm.Field>
          </HubForm.Section>

          {/* URL Patterns Section */}
          <HubForm.Section
            title="URL Patterns"
          >
            <HubForm.Field
              label="Hub URL Pattern"
            >
              <input
                type="text"
                value={formData.hubUrlPattern}
                onChange={(e) => handleChange('hubUrlPattern', e.target.value)}
                placeholder="/seo/hub/{slug}"
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Spoke URL Pattern"
            >
              <input
                type="text"
                value={formData.spokeUrlPattern}
                onChange={(e) => handleChange('spokeUrlPattern', e.target.value)}
                placeholder="/seo/spoke/{slug}"
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Canonical Base URL"
              error={errors.canonicalBaseUrl}
              required
            >
              <input
                type="url"
                value={formData.canonicalBaseUrl}
                onChange={(e) => handleChange('canonicalBaseUrl', e.target.value)}
                placeholder="https://tutorwise.io"
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>
          </HubForm.Section>

          {/* Sitemap Settings Section */}
          <HubForm.Section
            title="Sitemap Settings"
          >
            <HubToggle
              label="Enable Sitemap"
              checked={formData.enableSitemap}
              onChange={(checked) => handleChange('enableSitemap', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubForm.Field
              label="Update Frequency"
            >
              <select
                value={formData.updateFrequency}
                onChange={(e) => handleChange('updateFrequency', e.target.value)}
                disabled={isLoading || !canUpdate || !formData.enableSitemap}
              >
                <option value="always">Always</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="never">Never</option>
              </select>
            </HubForm.Field>

            <HubForm.Field
              label="Hub Priority"
              error={errors.priorityHubs}
            >
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.priorityHubs}
                onChange={(e) => handleChange('priorityHubs', parseFloat(e.target.value))}
                disabled={isLoading || !canUpdate || !formData.enableSitemap}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Spoke Priority"
              error={errors.prioritySpokes}
            >
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.prioritySpokes}
                onChange={(e) => handleChange('prioritySpokes', parseFloat(e.target.value))}
                disabled={isLoading || !canUpdate || !formData.enableSitemap}
              />
            </HubForm.Field>
          </HubForm.Section>

          {/* Content Settings Section */}
          <HubForm.Section
            title="Content Settings"
          >
            <HubForm.Field
              label="Minimum Hub Word Count"
            >
              <input
                type="number"
                min="100"
                value={formData.minHubWordCount}
                onChange={(e) => handleChange('minHubWordCount', parseInt(e.target.value))}
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Minimum Spoke Word Count"
            >
              <input
                type="number"
                min="100"
                value={formData.minSpokeWordCount}
                onChange={(e) => handleChange('minSpokeWordCount', parseInt(e.target.value))}
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubToggle
              label="Auto-generate Meta Descriptions"
              checked={formData.autoGenerateMetaDescriptions}
              onChange={(checked) => handleChange('autoGenerateMetaDescriptions', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubToggle
              label="Auto Internal Linking"
              checked={formData.autoInternalLinking}
              onChange={(checked) => handleChange('autoInternalLinking', checked)}
              disabled={isLoading || !canUpdate}
            />
          </HubForm.Section>

          {/* Save Button */}
          {canUpdate && (
            <div className={styles.saveButtonContainer}>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving || isLoading}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className={styles.configContent}>
          {/* Schema Markup Section */}
          <HubForm.Section
            title="Schema Markup"
          >
            <HubToggle
              label="Enable Schema Markup"
              checked={formData.enableSchemaMarkup}
              onChange={(checked) => handleChange('enableSchemaMarkup', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubForm.Field
              label="Default Hub Schema Type"
            >
              <input
                type="text"
                value={formData.defaultHubSchemaType}
                onChange={(e) => handleChange('defaultHubSchemaType', e.target.value)}
                placeholder="WebPage"
                disabled={isLoading || !canUpdate || !formData.enableSchemaMarkup}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Default Spoke Schema Type"
            >
              <input
                type="text"
                value={formData.defaultSpokeSchemaType}
                onChange={(e) => handleChange('defaultSpokeSchemaType', e.target.value)}
                placeholder="Article"
                disabled={isLoading || !canUpdate || !formData.enableSchemaMarkup}
              />
            </HubForm.Field>
          </HubForm.Section>

          {/* Robots.txt Section */}
          <HubForm.Section
            title="Robots.txt Settings"
          >
            <HubToggle
              label="Enable Robots.txt"
              checked={formData.enableRobotsTxt}
              onChange={(checked) => handleChange('enableRobotsTxt', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubToggle
              label="Allow Search Indexing"
              checked={formData.allowSearchIndexing}
              onChange={(checked) => handleChange('allowSearchIndexing', checked)}
              disabled={isLoading || !canUpdate || !formData.enableRobotsTxt}
            />

            <HubForm.Field
              label="Crawl Delay (seconds)"
            >
              <input
                type="number"
                min="0"
                value={formData.crawlDelaySeconds}
                onChange={(e) => handleChange('crawlDelaySeconds', parseInt(e.target.value))}
                disabled={isLoading || !canUpdate || !formData.enableRobotsTxt}
              />
            </HubForm.Field>
          </HubForm.Section>

          {/* Performance Section */}
          <HubForm.Section
            title="Performance Settings"
          >
            <HubToggle
              label="Enable Image Lazy Loading"
              checked={formData.enableImageLazyLoading}
              onChange={(checked) => handleChange('enableImageLazyLoading', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubToggle
              label="Enable CDN"
              checked={formData.enableCdn}
              onChange={(checked) => handleChange('enableCdn', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubForm.Field
              label="CDN Base URL"
            >
              <input
                type="url"
                value={formData.cdnBaseUrl}
                onChange={(e) => handleChange('cdnBaseUrl', e.target.value)}
                placeholder="https://cdn.tutorwise.io"
                disabled={isLoading || !canUpdate || !formData.enableCdn}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Cache TTL (minutes)"
            >
              <input
                type="number"
                min="0"
                value={formData.cacheTtlMinutes}
                onChange={(e) => handleChange('cacheTtlMinutes', parseInt(e.target.value))}
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>
          </HubForm.Section>

          {/* Analytics Integration Section */}
          <HubForm.Section
            title="Analytics Integration"
          >
            <HubToggle
              label="Enable Google Search Console"
              checked={formData.enableGoogleSearchConsole}
              onChange={(checked) => handleChange('enableGoogleSearchConsole', checked)}
              disabled={isLoading || !canUpdate}
            />

            <HubForm.Field
              label="Search Console Property URL"
            >
              <input
                type="url"
                value={formData.googleSearchConsolePropertyUrl}
                onChange={(e) => handleChange('googleSearchConsolePropertyUrl', e.target.value)}
                placeholder="https://tutorwise.io"
                disabled={isLoading || !canUpdate || !formData.enableGoogleSearchConsole}
              />
            </HubForm.Field>

            <HubForm.Field
              label="Google Analytics ID"
            >
              <input
                type="text"
                value={formData.googleAnalyticsId}
                onChange={(e) => handleChange('googleAnalyticsId', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                disabled={isLoading || !canUpdate}
              />
            </HubForm.Field>

            <HubToggle
              label="Track Internal Links"
              checked={formData.trackInternalLinks}
              onChange={(checked) => handleChange('trackInternalLinks', checked)}
              disabled={isLoading || !canUpdate}
            />
          </HubForm.Section>

          {/* Save Button */}
          {canUpdate && (
            <div className={styles.saveButtonContainer}>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving || isLoading}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          )}
        </div>
      )}
    </HubPageLayout>
  );
}
