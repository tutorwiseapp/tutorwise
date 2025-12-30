/**
 * Filename: src/app/api/admin/seo/config/route.ts
 * Purpose: API endpoint to fetch and update SEO configuration
 * Created: 2025-12-29
 * Pattern: Server-only API route with database-backed settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface SeoConfigResponse {
  metaDefaults: {
    metaTitleTemplate: string;
    metaDescriptionTemplate: string;
    ogImageUrl: string;
    ogType: string;
  };
  urlPatterns: {
    hubUrlPattern: string;
    spokeUrlPattern: string;
    canonicalBaseUrl: string;
  };
  schemaMarkup: {
    enableSchemaMarkup: boolean;
    defaultHubSchemaType: string;
    defaultSpokeSchemaType: string;
    organizationSchema: any;
  };
  sitemap: {
    enableSitemap: boolean;
    updateFrequency: string;
    priorityHubs: number;
    prioritySpokes: number;
  };
  robotsTxt: {
    enableRobotsTxt: boolean;
    allowSearchIndexing: boolean;
    crawlDelaySeconds: number;
  };
  performance: {
    enableImageLazyLoading: boolean;
    enableCdn: boolean;
    cdnBaseUrl: string;
    cacheTtlMinutes: number;
  };
  analytics: {
    enableGoogleSearchConsole: boolean;
    googleSearchConsolePropertyUrl: string;
    googleAnalyticsId: string;
    trackInternalLinks: boolean;
  };
  contentSettings: {
    minHubWordCount: number;
    minSpokeWordCount: number;
    autoGenerateMetaDescriptions: boolean;
    autoInternalLinking: boolean;
  };
}

/**
 * GET /api/admin/seo/config
 * Fetch SEO configuration from database
 */
export async function GET() {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch SEO settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('seo_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching SEO settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch SEO settings' },
        { status: 500 }
      );
    }

    const config: SeoConfigResponse = {
      metaDefaults: {
        metaTitleTemplate: settings.default_meta_title_template,
        metaDescriptionTemplate: settings.default_meta_description_template,
        ogImageUrl: settings.default_og_image_url || '',
        ogType: settings.default_og_type,
      },
      urlPatterns: {
        hubUrlPattern: settings.hub_url_pattern,
        spokeUrlPattern: settings.spoke_url_pattern,
        canonicalBaseUrl: settings.canonical_base_url,
      },
      schemaMarkup: {
        enableSchemaMarkup: settings.enable_schema_markup,
        defaultHubSchemaType: settings.default_hub_schema_type,
        defaultSpokeSchemaType: settings.default_spoke_schema_type,
        organizationSchema: settings.organization_schema,
      },
      sitemap: {
        enableSitemap: settings.enable_sitemap,
        updateFrequency: settings.sitemap_update_frequency,
        priorityHubs: Number(settings.sitemap_priority_hubs),
        prioritySpokes: Number(settings.sitemap_priority_spokes),
      },
      robotsTxt: {
        enableRobotsTxt: settings.enable_robots_txt,
        allowSearchIndexing: settings.allow_search_indexing,
        crawlDelaySeconds: settings.crawl_delay_seconds,
      },
      performance: {
        enableImageLazyLoading: settings.enable_image_lazy_loading,
        enableCdn: settings.enable_cdn,
        cdnBaseUrl: settings.cdn_base_url || '',
        cacheTtlMinutes: settings.cache_ttl_minutes,
      },
      analytics: {
        enableGoogleSearchConsole: settings.enable_google_search_console,
        googleSearchConsolePropertyUrl: settings.google_search_console_property_url || '',
        googleAnalyticsId: settings.google_analytics_id || '',
        trackInternalLinks: settings.track_internal_links,
      },
      contentSettings: {
        minHubWordCount: settings.min_hub_word_count,
        minSpokeWordCount: settings.min_spoke_word_count,
        autoGenerateMetaDescriptions: settings.auto_generate_meta_descriptions,
        autoInternalLinking: settings.auto_internal_linking,
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching SEO config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/seo/config
 * Update SEO configuration
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { metaDefaults, urlPatterns, schemaMarkup, sitemap, robotsTxt, performance, analytics, contentSettings } = body;

    // Update SEO settings in database
    const { error: updateError } = await supabase
      .from('seo_settings')
      .update({
        default_meta_title_template: metaDefaults.metaTitleTemplate,
        default_meta_description_template: metaDefaults.metaDescriptionTemplate,
        default_og_image_url: metaDefaults.ogImageUrl,
        default_og_type: metaDefaults.ogType,
        hub_url_pattern: urlPatterns.hubUrlPattern,
        spoke_url_pattern: urlPatterns.spokeUrlPattern,
        canonical_base_url: urlPatterns.canonicalBaseUrl,
        enable_schema_markup: schemaMarkup.enableSchemaMarkup,
        default_hub_schema_type: schemaMarkup.defaultHubSchemaType,
        default_spoke_schema_type: schemaMarkup.defaultSpokeSchemaType,
        organization_schema: schemaMarkup.organizationSchema,
        enable_sitemap: sitemap.enableSitemap,
        sitemap_update_frequency: sitemap.updateFrequency,
        sitemap_priority_hubs: sitemap.priorityHubs,
        sitemap_priority_spokes: sitemap.prioritySpokes,
        enable_robots_txt: robotsTxt.enableRobotsTxt,
        allow_search_indexing: robotsTxt.allowSearchIndexing,
        crawl_delay_seconds: robotsTxt.crawlDelaySeconds,
        enable_image_lazy_loading: performance.enableImageLazyLoading,
        enable_cdn: performance.enableCdn,
        cdn_base_url: performance.cdnBaseUrl,
        cache_ttl_minutes: performance.cacheTtlMinutes,
        enable_google_search_console: analytics.enableGoogleSearchConsole,
        google_search_console_property_url: analytics.googleSearchConsolePropertyUrl,
        google_analytics_id: analytics.googleAnalyticsId,
        track_internal_links: analytics.trackInternalLinks,
        min_hub_word_count: contentSettings.minHubWordCount,
        min_spoke_word_count: contentSettings.minSpokeWordCount,
        auto_generate_meta_descriptions: contentSettings.autoGenerateMetaDescriptions,
        auto_internal_linking: contentSettings.autoInternalLinking,
      })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating SEO settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SEO settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating SEO config:', error);
    return NextResponse.json(
      { error: 'Failed to update SEO configuration' },
      { status: 500 }
    );
  }
}
