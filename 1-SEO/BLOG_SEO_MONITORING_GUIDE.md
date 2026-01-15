# Blog SEO Monitoring & Analytics Guide

## Overview

This document outlines the SEO monitoring and analytics capabilities implemented for the Tutorwise blog platform.

## Table of Contents

1. [SEO Implementation Summary](#seo-implementation-summary)
2. [Key Metrics to Track](#key-metrics-to-track)
3. [Database Schema for Analytics](#database-schema-for-analytics)
4. [Integration Points](#integration-points)
5. [Recommended Tools](#recommended-tools)
6. [Monitoring Dashboard Ideas](#monitoring-dashboard-ideas)

---

## SEO Implementation Summary

### ✅ Implemented Features

1. **Meta Tags & Metadata**
   - Dynamic page titles with article titles
   - Custom meta descriptions (falls back to article description)
   - Meta keywords support
   - Author metadata

2. **Open Graph Tags**
   - OG title, description, type (article)
   - Published time, modified time
   - Author names
   - Featured images for social sharing
   - Article tags

3. **Twitter Cards**
   - Summary large image cards
   - Title, description, images

4. **Structured Data (JSON-LD)**
   - Schema.org Article markup
   - Author information
   - Publisher details
   - Published/modified dates
   - Main entity of page

5. **Sitemaps**
   - Dynamic blog sitemap (`/blog/sitemap.xml`)
   - Automatically includes all published articles
   - Category pages included
   - Last modified dates

6. **Robots.txt**
   - Proper crawl directives
   - Sitemap references
   - Admin/API path exclusions

7. **Technical SEO**
   - Canonical URLs
   - Proper heading hierarchy
   - Semantic HTML structure
   - Mobile-responsive design
   - Fast page load (Next.js optimizations)

---

## Key Metrics to Track

### 1. **Traffic Metrics**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Page Views | Total article views per day/week/month | Google Analytics, custom tracking |
| Unique Visitors | Distinct users visiting articles | Google Analytics |
| Avg Time on Page | How long users spend reading | Google Analytics |
| Bounce Rate | % of users leaving after one page | Google Analytics |
| Scroll Depth | How far users scroll (engagement) | Google Analytics events |

### 2. **Search Performance Metrics**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Search Impressions | How often articles appear in search | Google Search Console |
| Search Clicks | Clicks from search results | Google Search Console |
| Click-Through Rate (CTR) | Clicks / Impressions | Google Search Console |
| Average Position | Average ranking position | Google Search Console |
| Top Keywords | Keywords driving traffic | Google Search Console |

### 3. **Content Performance Metrics**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Top Performing Articles | Articles with most views | Custom analytics table |
| Worst Performing Articles | Articles needing improvement | Custom analytics table |
| Category Performance | Traffic by category | Custom analytics table |
| Content Freshness | Days since last update | blog_articles table |
| View Count | Total cumulative views | blog_articles.view_count |

### 4. **Link Metrics**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Total Backlinks | Number of external links | Ahrefs, SEMrush, blog_backlinks table |
| Backlink Quality | Domain authority of linking sites | Ahrefs, Moz |
| Internal Links | Links between articles | Custom crawl |
| Broken Links | 404 errors | Google Search Console |

### 5. **Keyword Performance**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Keyword Rankings | Position for target keywords | Google Search Console, SEMrush |
| Keyword Difficulty | Competition level | Ahrefs, SEMrush |
| Search Volume | Monthly searches | Google Keyword Planner |
| Keyword Gaps | Opportunities | SEMrush, Ahrefs |

### 6. **Technical SEO Health**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Page Load Speed | Core Web Vitals (LCP, FID, CLS) | Google PageSpeed Insights |
| Mobile Usability | Mobile-friendliness issues | Google Search Console |
| Index Coverage | Pages indexed vs submitted | Google Search Console |
| Crawl Errors | 404s, server errors | Google Search Console |
| Security Issues | HTTPS, mixed content | Google Search Console |

### 7. **Engagement Metrics**

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Social Shares | Shares on social platforms | Custom tracking, ShareThis |
| Comments | User engagement | Custom comments system |
| Newsletter Signups | Conversions from blog | Custom tracking |
| CTA Clicks | Call-to-action clicks | Google Analytics events |

---

## Database Schema for Analytics

### Tables Created

#### 1. `blog_article_metrics`
Tracks daily performance metrics per article.

**Key Fields:**
- `page_views`, `unique_visitors`
- `avg_time_on_page`, `bounce_rate`
- `organic_search`, `direct_traffic`, `social_traffic`
- `search_impressions`, `search_clicks`, `avg_search_position`

**Use Case:** Track daily article performance, identify trends

#### 2. `blog_seo_keywords`
Tracks keyword rankings per article.

**Key Fields:**
- `keyword`, `current_position`, `previous_position`
- `search_volume`, `difficulty`
- `impressions`, `clicks`, `ctr`

**Use Case:** Monitor keyword rankings, identify opportunities

#### 3. `blog_backlinks`
Tracks external links to articles.

**Key Fields:**
- `source_url`, `source_domain`
- `anchor_text`, `domain_authority`
- `is_follow`, `is_active`

**Use Case:** Monitor backlink profile, identify quality links

#### 4. `blog_seo_summary`
Daily summary of overall blog SEO health.

**Key Fields:**
- `total_articles`, `total_page_views`
- `avg_search_position`, `total_backlinks`
- `top_article_id`, `top_keyword`

**Use Case:** High-level dashboard overview

---

## Integration Points

### 1. Google Analytics 4 (GA4)

**Setup:**
```typescript
// Add to Layout.tsx or _app.tsx
import Script from 'next/script';

<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  `}
</Script>
```

**Track Custom Events:**
```typescript
// Track article reads
gtag('event', 'article_view', {
  article_id: article.id,
  article_title: article.title,
  category: article.category
});

// Track scroll depth
gtag('event', 'scroll_depth', {
  percent_scrolled: 75,
  article_id: article.id
});
```

### 2. Google Search Console

**Setup:**
1. Verify ownership via DNS or HTML file
2. Submit sitemap: `https://tutorwise.com/blog/sitemap.xml`
3. Monitor performance reports weekly

**API Integration:**
Use Search Console API to automatically pull metrics into `blog_seo_keywords` and `blog_article_metrics` tables.

### 3. Google PageSpeed Insights

**API Integration:**
```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://tutorwise.com/blog/article-slug&key=YOUR_API_KEY"
```

Track Core Web Vitals for each article.

### 4. Ahrefs / SEMrush

**Backlink Monitoring:**
- Use Ahrefs API to fetch backlinks weekly
- Store in `blog_backlinks` table
- Alert on new high-quality backlinks

**Keyword Research:**
- Identify keyword gaps
- Track competitor rankings
- Find content opportunities

### 5. Custom Analytics API

Create an API endpoint to receive analytics data:

```typescript
// /api/blog/analytics/track
POST /api/blog/analytics/track
{
  "article_id": "uuid",
  "event_type": "page_view",
  "metadata": {
    "source": "organic",
    "duration": 120
  }
}
```

---

## Recommended Tools

### Free Tools

1. **Google Analytics 4** - Traffic analytics
2. **Google Search Console** - Search performance
3. **Google PageSpeed Insights** - Performance monitoring
4. **Bing Webmaster Tools** - Bing search data
5. **Plausible / Fathom** - Privacy-friendly analytics (self-hosted)

### Paid Tools

1. **Ahrefs** ($99+/mo) - Backlinks, keywords, competitor analysis
2. **SEMrush** ($119+/mo) - All-in-one SEO platform
3. **Moz Pro** ($99+/mo) - SEO tracking and insights
4. **Screaming Frog** ($259/yr) - Technical SEO crawler
5. **Clearscope** ($170+/mo) - Content optimization

---

## Monitoring Dashboard Ideas

### Admin Dashboard: `/admin/blog/seo`

Create an SEO performance dashboard with these widgets:

#### 1. Overview Card
- Total articles published
- Total page views (last 30 days)
- Avg search position
- Total backlinks

#### 2. Top Performing Articles (Last 30 Days)
- Article title
- Page views
- Search clicks
- CTR
- Avg position

#### 3. Keyword Rankings
- Keyword
- Current position
- Change (↑↓)
- Search volume
- Article link

#### 4. Recent Backlinks
- Source domain
- Article
- Domain authority
- Date discovered

#### 5. Traffic Sources Chart
- Line chart: Organic, Direct, Social, Referral over time

#### 6. Search Performance Trends
- Line chart: Impressions, Clicks, CTR, Avg Position over time

#### 7. Content Health
- Articles needing updates (>6 months old)
- Underperforming articles (<100 views/month)
- Missing meta descriptions
- Missing featured images

#### 8. Alerts & Recommendations
- New backlinks from high-authority domains
- Ranking improvements/drops
- Crawl errors from GSC
- Broken internal links

---

## Automated Reporting

### Daily Reports (via Email)

Send automated email to admin with:
- Yesterday's page views
- New backlinks discovered
- Keyword position changes
- Top article of the day

### Weekly Reports

- Week-over-week traffic trends
- Best/worst performing articles
- Keyword opportunities
- Content recommendations

### Monthly Reports

- Month-over-month growth
- SEO health score
- Backlink acquisition rate
- Top content themes

---

## Action Items for Full SEO Integration

### Immediate (Week 1)

- [x] Add meta tags to all pages
- [x] Implement structured data
- [x] Create sitemaps
- [x] Add robots.txt
- [ ] Set up Google Analytics 4
- [ ] Set up Google Search Console
- [ ] Submit sitemaps to GSC

### Short-term (Month 1)

- [ ] Implement custom analytics tracking
- [ ] Create SEO metrics tables
- [ ] Set up daily data sync from GSC
- [ ] Build admin SEO dashboard
- [ ] Set up automated alerts

### Medium-term (Quarter 1)

- [ ] Integrate Ahrefs/SEMrush API
- [ ] Implement automated backlink monitoring
- [ ] Create content optimization recommendations
- [ ] Set up A/B testing for titles/descriptions
- [ ] Build internal linking recommendations

### Long-term (Year 1)

- [ ] AI-powered content suggestions
- [ ] Automated SEO audits
- [ ] Competitive analysis dashboard
- [ ] Content gap analysis
- [ ] ROI tracking per article

---

## Conclusion

With the foundation in place (meta tags, structured data, sitemaps), the next step is to integrate analytics tools and build the monitoring dashboard. This will provide actionable insights to continuously improve blog SEO performance and drive organic traffic growth.

For questions or assistance, refer to:
- [Google Search Console Help](https://support.google.com/webmasters)
- [Ahrefs Academy](https://ahrefs.com/academy)
- [Moz SEO Learning Center](https://moz.com/learn/seo)
