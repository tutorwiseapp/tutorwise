# Manual SEO Setup Tasks

## Overview

This document contains all the manual tasks you need to complete to fully activate SEO monitoring and analytics for the Tutorwise blog. All automated code implementations are complete - these are the final configuration steps.

---

## ✅ What's Already Done (Automated)

- ✅ Blog pages fetch articles from database
- ✅ Dynamic SEO metadata (titles, descriptions, keywords)
- ✅ OpenGraph and Twitter Card tags
- ✅ Structured data (JSON-LD) on all articles
- ✅ Dynamic sitemap generation
- ✅ Robots.txt configuration
- ✅ Google Analytics wrapper component
- ✅ Admin SEO dashboard page
- ✅ SEO health checker utility
- ✅ Analytics database schema
- ✅ API routes for tracking

---

## 🔧 Manual Tasks (You Need to Do)

### Task 1: Run Database Migrations

**Priority:** HIGH
**Time:** 5 minutes

Run the SEO analytics database migration to create tracking tables.

```bash
cd /Users/michaelquan/projects/tutorwise
# Run migration 175
psql your_database_url < tools/database/migrations/175_create_blog_seo_analytics_tables.sql
```

**What this does:**
- Creates `blog_article_metrics` table for daily performance tracking
- Creates `blog_seo_keywords` table for keyword rankings
- Creates `blog_backlinks` table for link monitoring
- Creates `blog_seo_summary` table for daily summaries

---

### Task 2: Set Up Google Analytics 4

**Priority:** HIGH
**Time:** 15 minutes

**Steps:**

1. **Create GA4 Property**
   - Go to https://analytics.google.com
   - Click "Admin" (gear icon)
   - Click "+ Create Property"
   - Name: "Tutorwise"
   - Set timezone to your local timezone
   - Set currency to GBP
   - Click "Next"
   - Choose industry category: "Education"
   - Choose business size
   - Click "Create"
   - Accept Terms of Service

2. **Get Measurement ID**
   - In GA4, go to "Admin" > "Data Streams"
   - Click "Add stream" > "Web"
   - Enter URL: https://tutorwise.com
   - Stream name: "Tutorwise Website"
   - Click "Create stream"
   - **Copy the Measurement ID** (format: G-XXXXXXXXXX)

3. **Add to Environment Variables**
   ```bash
   cd /Users/michaelquan/projects/tutorwise/apps/web

   # Add to .env.local
   echo "NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX" >> .env.local
   ```

4. **Add GoogleAnalytics Component to Layout**

   Edit `/Users/michaelquan/projects/tutorwise/apps/web/src/app/components/layout/Layout.tsx`:

   ```typescript
   import GoogleAnalytics from '@/app/components/analytics/GoogleAnalytics';

   export default function Layout({ children }: LayoutProps) {
     return (
       <>
         <GoogleAnalytics />
         {/* Rest of layout */}
       </>
     );
   }
   ```

5. **Verify Installation**
   - Deploy your changes
   - Visit your website
   - In GA4, go to "Reports" > "Realtime"
   - You should see your visit tracked

**Files involved:**
- `apps/web/src/app/components/analytics/GoogleAnalytics.tsx` (already created)
- `apps/web/.env.local` (you need to edit)
- `apps/web/src/app/components/layout/Layout.tsx` (you need to edit)

---

### Task 3: Set Up Google Search Console

**Priority:** HIGH
**Time:** 20 minutes

**Steps:**

1. **Verify Ownership**
   - Go to https://search.google.com/search-console
   - Click "Add property"
   - Choose "URL prefix": https://tutorwise.com
   - Click "Continue"

2. **Choose Verification Method**

   **Option A: HTML File Upload (Easiest)**
   - Download the verification file
   - Upload to `/Users/michaelquan/projects/tutorwise/apps/web/public/`
   - File will be accessible at https://tutorwise.com/google[hash].html
   - Click "Verify"

   **Option B: DNS Verification (Recommended)**
   - Copy the TXT record provided
   - Add to your DNS settings (Vercel, Cloudflare, etc.)
   - Wait a few minutes for DNS propagation
   - Click "Verify"

3. **Submit Sitemaps**
   - In Search Console, go to "Sitemaps" (left sidebar)
   - Click "Add a new sitemap"
   - Enter: `blog/sitemap.xml`
   - Click "Submit"
   - Wait 24-48 hours for Google to crawl

4. **Check Index Coverage**
   - Go to "Index" > "Coverage"
   - Monitor for any errors
   - Check back weekly

**What to monitor:**
- Performance (clicks, impressions, CTR, position)
- Coverage (indexed pages, errors)
- Enhancements (mobile usability, Core Web Vitals)

---

### Task 4: Set Up PageSpeed Insights Monitoring

**Priority:** MEDIUM
**Time:** 10 minutes

**Steps:**

1. **Get API Key**
   - Go to https://console.cloud.google.com
   - Create a new project or select existing
   - Enable "PageSpeed Insights API"
   - Go to "Credentials" > "Create Credentials" > "API Key"
   - Copy the API key

2. **Add to Environment Variables**
   ```bash
   echo "PAGESPEED_API_KEY=your_api_key_here" >> .env.local
   ```

3. **Test Manually**
   ```bash
   curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://tutorwise.com/blog&key=YOUR_API_KEY"
   ```

4. **Automate (Optional)**
   - Create a cron job or scheduled task to run weekly
   - Store results in database for historical tracking

---

### Task 5: Configure Ahrefs or SEMrush (Optional)

**Priority:** LOW
**Time:** 30 minutes
**Cost:** $99-119/month

**For Backlink Monitoring:**

**Option A: Ahrefs**
1. Sign up at https://ahrefs.com
2. Add your domain
3. Get API token from Settings
4. Add to `.env.local`:
   ```bash
   AHREFS_API_KEY=your_api_key
   ```

**Option B: SEMrush**
1. Sign up at https://www.semrush.com
2. Get API key from Settings > API
3. Add to `.env.local`:
   ```bash
   SEMRUSH_API_KEY=your_api_key
   ```

**What you get:**
- Backlink monitoring
- Keyword research
- Competitor analysis
- Rank tracking

---

### Task 6: Add SEO Link to Admin Sidebar

**Priority:** MEDIUM
**Time:** 5 minutes

Edit `/Users/michaelquan/projects/tutorwise/apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx`:

Add to the blog section:

```typescript
{
  label: 'SEO',
  href: '/admin/blog/seo',
  icon: SearchIcon, // or appropriate icon
},
```

This will make the SEO dashboard accessible from the admin navigation.

---

### Task 7: Test Everything

**Priority:** HIGH
**Time:** 15 minutes

**Checklist:**

1. **Blog Pages Load**
   - [ ] Visit https://tutorwise.com/blog
   - [ ] Should see articles from database
   - [ ] Click an article, should load

2. **SEO Meta Tags**
   - [ ] Right-click > "View Page Source"
   - [ ] Search for `<meta property="og:title"`
   - [ ] Verify OpenGraph tags present
   - [ ] Search for `application/ld+json`
   - [ ] Verify structured data present

3. **Sitemaps Work**
   - [ ] Visit https://tutorwise.com/blog/sitemap.xml
   - [ ] Should see XML with article URLs
   - [ ] Visit https://tutorwise.com/robots.txt
   - [ ] Should see sitemap reference

4. **Admin SEO Dashboard**
   - [ ] Visit https://tutorwise.com/admin/blog/seo
   - [ ] Should see setup checklist
   - [ ] Click quick links, verify they work

5. **Google Analytics**
   - [ ] Visit your website
   - [ ] Open GA4 > Realtime
   - [ ] Verify your visit shows up

6. **Search Console**
   - [ ] Check "Coverage" report
   - [ ] Verify no errors
   - [ ] Check "Sitemaps" report
   - [ ] Verify sitemap submitted

---

## 📊 Monitoring Cadence

Once setup is complete, follow this monitoring schedule:

| Task | Frequency | What to Check |
|------|-----------|---------------|
| Google Analytics | Daily | Page views, top articles, traffic sources |
| Search Console | Weekly | Keyword rankings, CTR, index coverage |
| Broken Links | Weekly | Check for 404 errors |
| Content Freshness | Monthly | Update old articles (6+ months) |
| Backlinks | Monthly | New backlinks, lost backlinks |
| Page Speed | Monthly | Core Web Vitals scores |
| Competitor Analysis | Quarterly | Keyword gaps, content opportunities |

---

## 🚨 Important Notes

### Development vs Production

The Google Analytics component automatically disables in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  return null; // GA won't load
}
```

Make sure to test in production or staging environment.

### Environment Variables Required

Add these to `.env.local`:

```bash
# Required for Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional for PageSpeed monitoring
PAGESPEED_API_KEY=your_api_key

# Optional for backlink monitoring
AHREFS_API_KEY=your_api_key
# OR
SEMRUSH_API_KEY=your_api_key
```

### Security

- Never commit `.env.local` to git
- API keys should be server-side only (no `NEXT_PUBLIC_` prefix)
- GA Measurement ID is public (has `NEXT_PUBLIC_` prefix)

---

## 📚 Additional Resources

- [Google Analytics 4 Documentation](https://support.google.com/analytics/answer/9304153)
- [Google Search Console Help](https://support.google.com/webmasters/answer/9128668)
- [PageSpeed Insights API Docs](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Ahrefs Academy](https://ahrefs.com/academy)
- [SEMrush Academy](https://www.semrush.com/academy/)

---

## ✅ Completion Checklist

Once you've completed all tasks, check off:

- [ ] Database migration 175 run successfully
- [ ] Google Analytics 4 configured and tracking
- [ ] Google Search Console verified and sitemap submitted
- [ ] PageSpeed Insights API key obtained (optional)
- [ ] Ahrefs or SEMrush configured (optional)
- [ ] SEO link added to admin sidebar
- [ ] All tests passed
- [ ] Monitoring schedule set up (calendar reminders)

---

## 🎯 Expected Outcomes

After completing these tasks, you should:

1. **See real-time traffic** in Google Analytics
2. **Track search performance** in Search Console
3. **Monitor keyword rankings** automatically
4. **Get alerts** for crawl errors or indexing issues
5. **View SEO health** in admin dashboard
6. **Generate reports** on blog performance

---

## 💡 Next Steps (Future Enhancements)

After initial setup, consider:

1. **Automated Reporting**
   - Send weekly email reports with top articles
   - Alert on ranking drops or gains
   - Notify on new backlinks

2. **Content Optimization**
   - Use SEO health checker to improve existing articles
   - A/B test titles and meta descriptions
   - Add internal linking recommendations

3. **Advanced Analytics**
   - Integrate Google Search Console API for automated data sync
   - Build custom dashboards with charts and trends
   - Set up conversion tracking for newsletter signups

4. **AI-Powered Insights**
   - Suggest keywords based on Search Console data
   - Recommend content gaps to fill
   - Auto-generate meta descriptions

---

## 🆘 Troubleshooting

### "Google Analytics not tracking"
- Check `.env.local` has correct `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Verify you're testing in production (not development)
- Check browser console for errors
- Disable ad blockers

### "Sitemap not showing in Search Console"
- Wait 24-48 hours after submission
- Check sitemap URL directly in browser
- Verify no syntax errors in sitemap XML

### "Articles not loading from database"
- Check database migration ran successfully
- Verify articles are marked as `published`
- Check `published_at` date is not in future
- Look for errors in browser console

---

**Questions or issues?** Refer to BLOG_SEO_MONITORING_GUIDE.md for detailed documentation.
