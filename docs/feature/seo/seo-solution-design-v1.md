# SEO Solution Design v1

**Date**: 2025-12-23
**Version**: 1.0
**Status**: Design Phase
**Author**: AI Analysis + Research

---

## Executive Summary

This document outlines a comprehensive SEO improvement strategy for Tutorwise based on competitive analysis of Airbnb and Superprof, combined with current state assessment. The solution addresses critical SEO gaps while adding a centralized management UI for ongoing optimization.

### Key Findings

**Current State**:
- ✅ Good meta tags on root layout
- ✅ Excellent SEO on listing/profile pages
- ❌ No JSON-LD structured data
- ❌ No sitemap.xml generation
- ❌ Limited content density on homepage
- ❌ Missing category/destination pages
- ❌ No centralized SEO management

**Competitive Insights**:
- **Airbnb**: Destination-based keyword clustering, 100+ internal links, SearchAction schema
- **Superprof**: AI-powered personalization focus, global presence with localized SEO
- **Industry**: 68% of online experiences start with search engines

### Solution Components

1. **JSON-LD Structured Data** - Rich snippets for better SERP appearance
2. **Dynamic Sitemap Generation** - Automated crawlability
3. **Listing-Focused Content Sections** - Category pages and internal linking
4. **Enhanced Heading Hierarchy** - SEO-friendly content structure
5. **Centralized SEO Management UI** - Admin control panel
6. **Database Schema for SEO Config** - Persistent, manageable settings

---

## 1. Current State Analysis

### 1.1 Homepage SEO Assessment

**Location**: [apps/web/src/app/page.tsx](apps/web/src/app/page.tsx)

**Metadata Status** (from layout.tsx):
```typescript
✅ Title: "Connect Clients with Credible Tutors & Educational Services | Tutorwise"
✅ Description: Well-written, compelling
✅ Keywords: Comprehensive array
✅ Open Graph: Complete with images
✅ Twitter Cards: Configured
✅ Robots: Proper directives
✅ Canonical: Set correctly
```

**Critical Gaps**:
```typescript
❌ No JSON-LD structured data
❌ No SearchAction schema for search functionality
❌ No Organization schema
❌ No BreadcrumbList schema
❌ Limited visible content (H2-H6 sections)
❌ No destination/subject category sections
❌ No internal linking strategy
❌ No sitemap.xml
❌ No robots.txt
```

### 1.2 Competitive Analysis Summary

**Airbnb's Approach**:
- Tabbed vertical architecture with progressive enhancement
- Destination-based keyword clustering (e.g., "villa rentals in Bath")
- ~100+ internal links across categories (Popular, Coastal, Historic, Islands, Lakes)
- SearchAction structured data for search functionality
- Pillar pages as intermediaries (not individual listings on homepage)
- Moderate content density with metadata-rich structured data
- Deferred component loading with GraphQL
- Mobile-first responsive design

**Superprof's Strategy**:
- AI-powered personalized learning positioning for 2025
- Global presence (40+ countries, country-specific sub-sites)
- Heavy SEO investment recognition
- Subject-based tutor marketplace

**Key Takeaways**:
1. **Content Hub Model**: Homepage as navigation hub, not listing showcase
2. **Internal Linking**: Strategic category-based linking for PageRank distribution
3. **Structured Data**: Critical for rich snippets and SERP features
4. **Scalable Taxonomy**: Subject + Location + Service Type combinations
5. **Progressive Enhancement**: Crawlable content + client-side enhancements

---

## 2. Solution Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Tutorwise SEO System                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  API Layer   │────▶│   Database   │
│              │     │              │     │              │
│ • Homepage   │     │ • Sitemap    │     │ • seo_config │
│ • Categories │     │ • Robots.txt │     │ • categories │
│ • Listings   │     │ • JSON-LD    │     │ • listings   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │                     │
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Admin UI    │     │  Generated   │     │  Analytics   │
│              │     │              │     │              │
│ • SEO Config │     │ • sitemap.xml│     │ • Rankings   │
│ • Categories │     │ • robots.txt │     │ • Traffic    │
│ • Keywords   │     │ • JSON-LD    │     │ • Indexing   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Structured Data** | JSON-LD in Next.js layout | Standard, easily crawlable |
| **Sitemap** | Next.js Route Handler | Dynamic generation from DB |
| **Content Sections** | Server Components | SEO-friendly SSR |
| **Admin UI** | Next.js + React Query | Existing architecture |
| **Database** | Supabase (PostgreSQL) | Current stack |
| **Validation** | Zod schemas | Type safety |

---

## 3. Component Design

### 3.1 JSON-LD Structured Data

#### 3.1.1 Organization Schema

**Location**: [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx)

**Implementation**:
```typescript
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Tutorwise",
  "url": "https://tutorwise.com",
  "logo": "https://tutorwise.com/logo.png",
  "description": "Connect with verified, credible tutors for personalized learning...",
  "sameAs": [
    "https://twitter.com/tutorwise",
    "https://www.facebook.com/tutorwise",
    "https://www.linkedin.com/company/tutorwise"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "email": "support@tutorwise.com"
  }
}
```

**Benefits**:
- Knowledge Graph eligibility
- Rich snippets in SERP
- Brand authority signals

#### 3.1.2 WebSite Schema with SearchAction

**Location**: [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx)

**Implementation**:
```typescript
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Tutorwise",
  "url": "https://tutorwise.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://tutorwise.com/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

**Benefits**:
- Google Sitelinks Search Box
- Enhanced SERP presence
- Direct search from Google results

#### 3.1.3 BreadcrumbList Schema

**Location**: Dynamic per page (category, listing, profile pages)

**Implementation Pattern**:
```typescript
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://tutorwise.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "GCSE Tutors",
      "item": "https://tutorwise.com/subjects/gcse"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "GCSE Maths Tutors in London",
      "item": "https://tutorwise.com/subjects/gcse/maths/london"
    }
  ]
}
```

**Benefits**:
- Breadcrumb display in SERP
- Site structure clarity
- Improved navigation UX

#### 3.1.4 ItemList Schema (Homepage Featured Listings)

**Location**: [apps/web/src/app/page.tsx](apps/web/src/app/page.tsx)

**Implementation**:
```typescript
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Featured Tutors",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Product",
        "name": "GCSE Maths Tutoring with John Smith",
        "url": "https://tutorwise.com/listings/[id]",
        "image": "...",
        "offers": {
          "@type": "Offer",
          "price": "30",
          "priceCurrency": "GBP"
        }
      }
    }
    // ... more items
  ]
}
```

**Benefits**:
- Rich listing previews
- Price display in SERP
- Carousel eligibility

---

### 3.2 Dynamic Sitemap Generation

#### 3.2.1 Sitemap Architecture

**Files to Create**:
```
apps/web/src/app/
├── sitemap.ts                  # Main sitemap index
├── sitemap-profiles.ts         # Dynamic profile URLs
├── sitemap-listings.ts         # Dynamic listing URLs
├── sitemap-help-centre.ts      # Help centre articles
├── sitemap-categories.ts       # Category pages
└── robots.ts                   # robots.txt generation
```

#### 3.2.2 Main Sitemap Implementation

**File**: `apps/web/src/app/sitemap.ts`

```typescript
import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tutorwise.com'

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about-tutorwise`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/help-centre`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    // ... more static pages
  ]

  return [
    ...staticPages,
    // Dynamic sitemaps will be separate files
  ]
}
```

#### 3.2.3 Dynamic Profile Sitemap

**File**: `apps/web/src/app/sitemap-profiles.xml/route.ts`

```typescript
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const baseUrl = 'https://tutorwise.com'

  // Fetch all published profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, updated_at, full_name')
    .eq('account_type', 'Tutor')
    .order('updated_at', { ascending: false })

  const urls = profiles?.map((profile) => {
    const slug = profile.full_name
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return `
    <url>
      <loc>${baseUrl}/public-profile/${profile.id}/${slug}</loc>
      <lastmod>${new Date(profile.updated_at).toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`
  }).join('') || ''

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
```

#### 3.2.4 Dynamic Listing Sitemap

**File**: `apps/web/src/app/sitemap-listings.xml/route.ts`

```typescript
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const baseUrl = 'https://tutorwise.com'

  // Fetch all published listings
  const { data: listings } = await supabase
    .from('listings_v4_1')
    .select('id, updated_at, title')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  const urls = listings?.map((listing) => {
    const slug = listing.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return `
    <url>
      <loc>${baseUrl}/listings/${listing.id}/${slug}</loc>
      <lastmod>${new Date(listing.updated_at).toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>`
  }).join('') || ''

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30 min cache
    },
  })
}
```

#### 3.2.5 Robots.txt Generation

**File**: `apps/web/src/app/robots.ts`

```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tutorwise.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/(authenticated)/*',
          '/onboarding/',
          '/login',
          '/signup',
        ],
      },
      {
        userAgent: 'GPTBot', // OpenAI crawler
        disallow: '/',
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-profiles.xml`,
      `${baseUrl}/sitemap-listings.xml`,
      `${baseUrl}/sitemap-help-centre.xml`,
      `${baseUrl}/sitemap-categories.xml`,
    ],
  }
}
```

**Benefits**:
- Comprehensive crawlability
- Automatic discovery of new content
- Proper indexing directives
- Multiple sitemap support

---

### 3.3 Listing-Focused SEO Content Sections

#### 3.3.1 Homepage Content Architecture

**Airbnb-Inspired Category Structure**:

```
Homepage
├── Hero Section (existing AI search)
├── Featured Listings (existing grid)
├── [NEW] Browse by Subject
│   ├── Popular Subjects (GCSE Maths, A-Level Physics, etc.)
│   ├── Academic Subjects (Sciences, Languages, Humanities)
│   ├── Creative Subjects (Music, Art, Drama)
│   └── Professional Skills (Coding, Business, Languages)
├── [NEW] Browse by Location
│   ├── Major Cities (London, Manchester, Birmingham)
│   ├── Regions (South East, North West, Scotland)
│   └── Online Tutoring (No location required)
├── [NEW] Browse by Service Type
│   ├── One-to-One Tutoring
│   ├── Group Sessions
│   ├── Workshops
│   └── Study Packages
├── [NEW] Popular Combinations
│   ├── GCSE Maths Tutors in London
│   ├── Online A-Level Chemistry Tutors
│   ├── Piano Teachers in Manchester
│   └── ... (50+ combinations)
└── [NEW] Educational Resources
    ├── How to Choose a Tutor
    ├── Study Tips by Subject
    └── Exam Preparation Guides
```

#### 3.3.2 Content Section Component Design

**File**: `apps/web/src/app/components/seo/CategorySection.tsx`

```typescript
interface CategorySectionProps {
  title: string
  description?: string
  categories: {
    id: string
    name: string
    href: string
    count?: number
    icon?: string
  }[]
}

export function CategorySection({ title, description, categories }: CategorySectionProps) {
  return (
    <section className={styles.categorySection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description && <p className={styles.sectionDescription}>{description}</p>}

      <div className={styles.categoryGrid}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className={styles.categoryCard}
          >
            {category.icon && <span className={styles.icon}>{category.icon}</span>}
            <h3 className={styles.categoryName}>{category.name}</h3>
            {category.count && (
              <span className={styles.count}>{category.count} tutors</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
```

#### 3.3.3 SEO-Optimized Homepage Structure

**Enhanced Homepage** (`apps/web/src/app/page.tsx`):

```typescript
export default function HomePage() {
  return (
    <div className={styles.marketplacePage}>
      {/* Existing Hero + Search */}
      <HeroSection />
      <MarketplaceGrid /> {/* Existing featured listings */}

      {/* NEW SEO Content Sections */}
      <CategorySection
        title="Browse by Subject"
        description="Find expert tutors for any subject"
        categories={POPULAR_SUBJECTS}
      />

      <CategorySection
        title="Browse by Location"
        description="Connect with tutors near you or online"
        categories={POPULAR_LOCATIONS}
      />

      <CategorySection
        title="Popular Searches"
        description="Frequently searched tutor categories"
        categories={POPULAR_COMBINATIONS}
      />

      <FAQSection /> {/* NEW: SEO-friendly FAQ with Schema */}
    </div>
  )
}
```

#### 3.3.4 Dynamic Category Data Source

**Option A: Hardcoded (Phase 1)**:
```typescript
// apps/web/src/lib/data/seo-categories.ts
export const POPULAR_SUBJECTS = [
  { id: 'gcse-maths', name: 'GCSE Maths', href: '/subjects/gcse/maths', count: 342 },
  { id: 'a-level-chemistry', name: 'A-Level Chemistry', href: '/subjects/a-level/chemistry', count: 189 },
  // ... more subjects
]
```

**Option B: Database-Driven (Phase 2)**:
```typescript
// Fetch from new `seo_categories` table
const { data: categories } = await supabase
  .from('seo_categories')
  .select('*')
  .eq('enabled', true)
  .eq('section', 'subjects')
  .order('display_order')
```

---

### 3.4 Enhanced Heading Hierarchy

#### 3.4.1 Current Homepage Headings

**Existing**:
```html
<h1>Find your perfect match with AI</h1>
<!-- No H2-H6 headings below -->
```

**SEO Problems**:
- Single H1, no content hierarchy
- No keyword-rich subheadings
- Missing semantic structure
- Poor topical relevance signals

#### 3.4.2 Proposed Heading Structure

**Enhanced**:
```html
<!-- Hero -->
<h1>Find Verified Tutors & Educational Services</h1>
<p class="subtitle">Connect with expert tutors for personalized learning</p>

<!-- Subject Categories -->
<h2>Browse Tutors by Subject</h2>
<h3>Academic Subjects</h3>
  <h4>GCSE Tutors</h4>
  <h4>A-Level Tutors</h4>
<h3>Creative Subjects</h3>
  <h4>Music Teachers</h4>
  <h4>Art Tutors</h4>

<!-- Location Categories -->
<h2>Find Tutors Near You</h2>
<h3>Tutors in London</h3>
<h3>Tutors in Manchester</h3>

<!-- Service Types -->
<h2>Choose Your Learning Style</h2>
<h3>One-to-One Tutoring</h3>
<h3>Group Sessions & Workshops</h3>

<!-- FAQ -->
<h2>Frequently Asked Questions</h2>
<h3>How do I choose the right tutor?</h3>
<h3>What qualifications should tutors have?</h3>
```

**Benefits**:
- Clear content hierarchy
- Keyword distribution
- Topic modeling signals
- Semantic HTML structure
- Better accessibility

---

### 3.5 Centralized SEO Management UI

#### 3.5.1 Admin Dashboard Overview

**Location**: `apps/web/src/app/(authenticated)/admin/seo/page.tsx`

**Features**:
```
SEO Management Dashboard
├── General Settings
│   ├── Site Title
│   ├── Meta Description
│   ├── Default OG Image
│   ├── Social Media Links
│   └── Contact Information
├── Structured Data
│   ├── Organization Schema
│   ├── SearchAction Configuration
│   └── Default Schemas
├── Category Management
│   ├── Subject Categories
│   ├── Location Categories
│   ├── Service Type Categories
│   └── Popular Combinations
├── Sitemap Configuration
│   ├── Include/Exclude Rules
│   ├── Priority Settings
│   ├── Change Frequency
│   └── Last Generated
├── Keywords & Tracking
│   ├── Target Keywords
│   ├── Ranking Monitoring
│   └── Search Console Integration
└── Analytics
    ├── Indexing Status
    ├── Top Pages
    ├── Search Performance
    └── Technical SEO Health
```

#### 3.5.2 UI Component Structure

**Main Dashboard** (`apps/web/src/app/(authenticated)/admin/seo/page.tsx`):

```typescript
export default function SEOManagementPage() {
  return (
    <Container>
      <PageHeader
        title="SEO Management"
        description="Configure and optimize your site's search engine performance"
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="structured-data">Structured Data</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsForm />
        </TabsContent>

        <TabsContent value="structured-data">
          <StructuredDataConfig />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="sitemap">
          <SitemapConfig />
        </TabsContent>

        <TabsContent value="analytics">
          <SEOAnalytics />
        </TabsContent>
      </Tabs>
    </Container>
  )
}
```

#### 3.5.3 Category Manager UI

**Component**: `apps/web/src/app/(authenticated)/admin/seo/components/CategoryManager.tsx`

```typescript
interface SEOCategory {
  id: string
  section: 'subjects' | 'locations' | 'service-types' | 'combinations'
  name: string
  slug: string
  href: string
  description?: string
  enabled: boolean
  display_order: number
  listing_count?: number
  created_at: string
  updated_at: string
}

export function CategoryManager() {
  const [categories, setCategories] = useState<SEOCategory[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('subjects')

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Categories</CardTitle>
        <CardDescription>
          Manage category links displayed on the homepage for SEO
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className={styles.controls}>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subjects">Subjects</SelectItem>
              <SelectItem value="locations">Locations</SelectItem>
              <SelectItem value="service-types">Service Types</SelectItem>
              <SelectItem value="combinations">Popular Combinations</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddCategory}>
            <PlusIcon /> Add Category
          </Button>
        </div>

        <DataTable
          columns={categoryColumns}
          data={categories}
          onReorder={handleReorder}
          sortable
        />
      </CardContent>
    </Card>
  )
}
```

#### 3.5.4 Structured Data Config UI

**Component**: `apps/web/src/app/(authenticated)/admin/seo/components/StructuredDataConfig.tsx`

```typescript
export function StructuredDataConfig() {
  const [config, setConfig] = useState<StructuredDataConfig>()

  return (
    <div className={styles.structuredDataConfig}>
      <Card>
        <CardHeader>
          <CardTitle>Organization Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <Form>
            <FormField label="Organization Name">
              <Input defaultValue="Tutorwise" />
            </FormField>

            <FormField label="Logo URL">
              <Input defaultValue="https://tutorwise.com/logo.png" />
            </FormField>

            <FormField label="Social Media Links">
              <MultiInput
                placeholder="https://twitter.com/tutorwise"
                values={config?.socialLinks || []}
              />
            </FormField>

            <FormField label="Contact Email">
              <Input defaultValue="support@tutorwise.com" />
            </FormField>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SearchAction Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <Form>
            <FormField label="Search URL Template">
              <Input defaultValue="https://tutorwise.com/?q={search_term_string}" />
            </FormField>

            <FormField label="Enable Search Box">
              <Switch defaultChecked />
            </FormField>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview & Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock language="json">
            {JSON.stringify(generateJSONLD(config), null, 2)}
          </CodeBlock>

          <Button onClick={validateSchema}>
            Validate with Google Rich Results Test
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 3.6 Database Schema for SEO Configuration

#### 3.6.1 Tables Design

**Table 1: `seo_config`**

```sql
CREATE TABLE seo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  CONSTRAINT seo_config_key_check CHECK (char_length(key) <= 100)
);

-- Example rows:
-- key: 'organization_schema', value: { name: 'Tutorwise', ... }
-- key: 'search_action', value: { urlTemplate: '...', ... }
-- key: 'default_og_image', value: { url: '...', ... }
```

**Table 2: `seo_categories`**

```sql
CREATE TABLE seo_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('subjects', 'locations', 'service-types', 'combinations')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  href TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  listing_count INTEGER DEFAULT 0,
  metadata JSONB, -- Additional SEO data (keywords, custom schema, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section, slug)
);

CREATE INDEX idx_seo_categories_section ON seo_categories(section);
CREATE INDEX idx_seo_categories_enabled ON seo_categories(enabled);
CREATE INDEX idx_seo_categories_order ON seo_categories(display_order);
```

**Table 3: `seo_keywords`**

```sql
CREATE TABLE seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  target_url TEXT,
  current_rank INTEGER,
  previous_rank INTEGER,
  search_volume INTEGER,
  difficulty INTEGER,
  tracked BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword, target_url)
);

CREATE INDEX idx_seo_keywords_tracked ON seo_keywords(tracked);
CREATE INDEX idx_seo_keywords_rank ON seo_keywords(current_rank);
```

**Table 4: `seo_meta_overrides`**

```sql
CREATE TABLE seo_meta_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT[],
  og_image TEXT,
  structured_data JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allows per-page meta tag customization
-- Example: Override meta tags for /subjects/gcse/maths
```

#### 3.6.2 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE seo_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_meta_overrides ENABLE ROW LEVEL SECURITY;

-- Policies (Admin-only write, public read)
CREATE POLICY "Public read access" ON seo_config
  FOR SELECT USING (true);

CREATE POLICY "Admin write access" ON seo_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.account_type = 'Admin'
    )
  );

-- Repeat for other tables...
```

#### 3.6.3 Database Functions

**Function: Update Listing Counts**

```sql
CREATE OR REPLACE FUNCTION update_seo_category_counts()
RETURNS void AS $$
BEGIN
  -- Update subject counts
  UPDATE seo_categories sc
  SET listing_count = (
    SELECT COUNT(*)
    FROM listings_v4_1 l
    WHERE l.status = 'published'
    AND sc.slug = ANY(l.subjects)
  )
  WHERE sc.section = 'subjects';

  -- Update location counts
  UPDATE seo_categories sc
  SET listing_count = (
    SELECT COUNT(*)
    FROM listings_v4_1 l
    WHERE l.status = 'published'
    AND LOWER(l.location_city) = sc.slug
  )
  WHERE sc.section = 'locations';

  -- Update service type counts
  UPDATE seo_categories sc
  SET listing_count = (
    SELECT COUNT(*)
    FROM listings_v4_1 l
    WHERE l.status = 'published'
    AND l.service_type = sc.slug
  )
  WHERE sc.section = 'service-types';
END;
$$ LANGUAGE plpgsql;

-- Schedule nightly via cron or trigger
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Foundation (Week 1)

**Goals**: Critical SEO infrastructure

**Tasks**:

1. **Database Schema Setup** (2 hours)
   - Create tables: `seo_config`, `seo_categories`, `seo_keywords`, `seo_meta_overrides`
   - Apply RLS policies
   - Create database functions
   - Seed initial data

2. **JSON-LD Structured Data** (4 hours)
   - Implement Organization schema in root layout
   - Implement WebSite + SearchAction schema
   - Create utility functions for dynamic schema generation
   - Test with Google Rich Results Test

3. **Sitemap Generation** (6 hours)
   - Create `sitemap.ts` (main index)
   - Create `sitemap-profiles.xml/route.ts`
   - Create `sitemap-listings.xml/route.ts`
   - Create `sitemap-help-centre.xml/route.ts`
   - Create `robots.ts`
   - Submit to Google Search Console

4. **Testing & Validation** (2 hours)
   - Validate all structured data
   - Test sitemap generation
   - Verify robots.txt
   - Check Search Console indexing

**Deliverables**:
- ✅ Database schema deployed
- ✅ JSON-LD on homepage and key pages
- ✅ Dynamic sitemaps generating
- ✅ Robots.txt configured
- ✅ Submitted to Google Search Console

**Estimated Effort**: 14 hours (2 working days)

---

### 4.2 Phase 2: Content Enhancement (Week 2)

**Goals**: Homepage SEO content sections

**Tasks**:

1. **Category Data Preparation** (3 hours)
   - Seed `seo_categories` table with initial data
   - Define popular subjects, locations, service types
   - Create popular combination queries
   - Update listing counts

2. **Homepage Content Components** (8 hours)
   - Create `CategorySection` component
   - Create `PopularSearches` component
   - Create `FAQSection` component with FAQ schema
   - Update homepage with new sections
   - Implement proper H2-H6 hierarchy

3. **Category Landing Pages** (6 hours)
   - Create `/subjects/[subject]/page.tsx`
   - Create `/locations/[location]/page.tsx`
   - Create `/service-types/[type]/page.tsx`
   - Implement breadcrumb schema
   - Add proper metadata

4. **Internal Linking Strategy** (2 hours)
   - Link homepage categories to landing pages
   - Link landing pages to listings
   - Implement related categories
   - Add "Browse more" sections

5. **Testing** (2 hours)
   - Test all category pages
   - Validate internal links
   - Check breadcrumb display
   - Monitor Core Web Vitals impact

**Deliverables**:
- ✅ SEO content sections on homepage
- ✅ Category landing pages created
- ✅ 100+ internal links added
- ✅ Proper heading hierarchy
- ✅ Breadcrumb navigation

**Estimated Effort**: 21 hours (3 working days)

---

### 4.3 Phase 3: Admin UI (Week 3)

**Goals**: Centralized SEO management

**Tasks**:

1. **Admin Dashboard Setup** (4 hours)
   - Create `/admin/seo/page.tsx`
   - Implement tab navigation
   - Add admin-only access control
   - Create base layout

2. **General Settings Tab** (4 hours)
   - Organization info form
   - Social media links manager
   - Default OG image uploader
   - Contact information

3. **Structured Data Tab** (5 hours)
   - Organization schema editor
   - SearchAction config
   - JSON preview and validation
   - Google Rich Results Test integration

4. **Category Manager Tab** (8 hours)
   - Category CRUD operations
   - Drag-and-drop reordering
   - Bulk enable/disable
   - Live listing count updates
   - Category preview

5. **Sitemap Config Tab** (3 hours)
   - Include/exclude rules
   - Priority settings
   - Manual regeneration trigger
   - Last generated timestamp

6. **Analytics Tab** (6 hours)
   - Google Search Console integration
   - Indexing status display
   - Top pages by traffic
   - Keyword ranking chart
   - Technical SEO health checks

7. **Testing** (2 hours)
   - Test all CRUD operations
   - Verify permissions
   - Check data persistence
   - Monitor performance

**Deliverables**:
- ✅ Fully functional SEO admin dashboard
- ✅ Category management interface
- ✅ Structured data configuration
- ✅ Analytics integration
- ✅ Sitemap controls

**Estimated Effort**: 32 hours (4 working days)

---

### 4.4 Phase 4: Optimization & Monitoring (Week 4)

**Goals**: Performance optimization and ongoing monitoring

**Tasks**:

1. **Performance Optimization** (6 hours)
   - Add caching to sitemap routes
   - Optimize database queries
   - Implement Redis caching for categories
   - Add revalidation strategies

2. **Search Console Integration** (4 hours)
   - Set up API access
   - Fetch indexing data
   - Monitor crawl errors
   - Track search performance

3. **Keyword Tracking** (4 hours)
   - Implement ranking checker
   - Set up automated tracking
   - Create ranking history charts
   - Alert on ranking drops

4. **Content Recommendations** (4 hours)
   - AI-powered keyword suggestions
   - Content gap analysis
   - Internal linking opportunities
   - Meta tag optimization suggestions

5. **Documentation** (3 hours)
   - Admin user guide
   - SEO best practices doc
   - Troubleshooting guide
   - Developer documentation

6. **Launch Preparation** (3 hours)
   - Final QA testing
   - Performance benchmarking
   - Security audit
   - Rollout plan

**Deliverables**:
- ✅ Optimized performance
- ✅ Search Console integrated
- ✅ Keyword tracking active
- ✅ Complete documentation
- ✅ Production-ready system

**Estimated Effort**: 24 hours (3 working days)

---

## 5. Technical Specifications

### 5.1 File Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx                          # [MODIFY] Add Organization & WebSite JSON-LD
│   ├── page.tsx                            # [MODIFY] Add SEO content sections
│   ├── sitemap.ts                          # [NEW] Main sitemap
│   ├── robots.ts                           # [NEW] Robots.txt
│   ├── sitemap-profiles.xml/
│   │   └── route.ts                        # [NEW] Profile sitemap
│   ├── sitemap-listings.xml/
│   │   └── route.ts                        # [NEW] Listing sitemap
│   ├── sitemap-help-centre.xml/
│   │   └── route.ts                        # [NEW] Help centre sitemap
│   ├── sitemap-categories.xml/
│   │   └── route.ts                        # [NEW] Category sitemap
│   ├── subjects/
│   │   └── [subject]/
│   │       └── page.tsx                    # [NEW] Subject category pages
│   ├── locations/
│   │   └── [location]/
│   │       └── page.tsx                    # [NEW] Location category pages
│   ├── service-types/
│   │   └── [type]/
│   │       └── page.tsx                    # [NEW] Service type category pages
│   └── (authenticated)/
│       └── admin/
│           └── seo/
│               ├── page.tsx                # [NEW] Admin dashboard
│               ├── layout.tsx              # [NEW] SEO admin layout
│               └── components/
│                   ├── GeneralSettingsForm.tsx
│                   ├── StructuredDataConfig.tsx
│                   ├── CategoryManager.tsx
│                   ├── SitemapConfig.tsx
│                   └── SEOAnalytics.tsx
├── components/
│   └── seo/
│       ├── CategorySection.tsx             # [NEW] Homepage category sections
│       ├── PopularSearches.tsx             # [NEW] Popular search links
│       ├── FAQSection.tsx                  # [NEW] FAQ with schema
│       └── BreadcrumbNav.tsx               # [NEW] Breadcrumb with JSON-LD
├── lib/
│   ├── api/
│   │   └── seo.ts                          # [NEW] SEO data fetching
│   ├── schemas/
│   │   └── seo-structured-data.ts          # [NEW] JSON-LD generators
│   └── data/
│       └── seo-categories.ts               # [NEW] Initial category data
└── types/
    └── seo.ts                              # [NEW] SEO-related types
```

### 5.2 Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",           // Existing - sitemap/robots support
    "react": "^18.0.0",           // Existing
    "react-query": "^5.0.0",      // Existing
    "@supabase/supabase-js": "^2.0.0", // Existing
    "zod": "^3.0.0"               // Existing - validation
  },
  "devDependencies": {
    "@types/node": "^20.0.0"      // Existing
  }
}
```

**No new dependencies required** - using existing stack.

### 5.3 Environment Variables

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# New (Optional - for Search Console integration)
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=...
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY=...
GOOGLE_SEARCH_CONSOLE_PROPERTY_URL=https://tutorwise.com
```

### 5.4 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Sitemap Generation** | < 3s | Time to generate all sitemaps |
| **Homepage Load** | < 2s | First Contentful Paint |
| **Category Page Load** | < 1.5s | Time to Interactive |
| **Admin Dashboard Load** | < 2.5s | Initial render |
| **Database Queries** | < 50ms | 95th percentile |
| **Cache Hit Rate** | > 80% | Sitemap & category data |

---

## 6. Success Metrics

### 6.1 SEO Performance Metrics

**Short-term (1-3 months)**:
- ✅ Sitemap indexed by Google (100% of pages)
- ✅ Rich snippets appearing in SERP (Organization, SearchBox)
- ✅ Homepage ranking for brand terms (position 1-3)
- ✅ 50+ category pages indexed
- ✅ Internal link count increased to 100+

**Medium-term (3-6 months)**:
- ✅ Organic traffic increase by 30%
- ✅ 10+ keywords in top 10 positions
- ✅ Click-through rate improvement by 20%
- ✅ Average position improved by 15 spots
- ✅ Structured data showing in 80% of results

**Long-term (6-12 months)**:
- ✅ Organic traffic increase by 100%
- ✅ 50+ keywords in top 10 positions
- ✅ Domain authority increase
- ✅ Featured snippets captured for key queries
- ✅ Top 3 ranking for core educational keywords

### 6.2 Technical Metrics

**Indexing**:
- 100% of published listings indexed
- 100% of published profiles indexed
- 100% of help centre articles indexed
- 100% of category pages indexed
- 0 crawl errors in Search Console

**Structured Data**:
- 0 structured data errors
- Rich results appearing for:
  - Organization (Knowledge Panel)
  - SearchAction (Sitelinks Search Box)
  - BreadcrumbList (Breadcrumb display)
  - Product (Listing rich snippets)

**Performance**:
- Core Web Vitals passing (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- Mobile-friendly test passing
- PageSpeed Insights score > 90

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Performance degradation** from content sections | Medium | Low | Implement lazy loading, pagination |
| **Database overload** from sitemap generation | High | Low | Add caching, rate limiting |
| **Structured data errors** causing deindexing | High | Low | Validate before deploy, monitoring |
| **Admin UI permission bypass** | Critical | Very Low | RLS policies, auth checks |
| **Category page duplication** | Medium | Low | Canonical URLs, redirect rules |

### 7.2 SEO Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Google penalty** for over-optimization | High | Very Low | Follow webmaster guidelines, manual review |
| **Keyword cannibalization** | Medium | Medium | Proper internal linking, distinct URLs |
| **Thin content** on category pages | Medium | Low | Add unique descriptions, filtering |
| **Schema markup errors** | Medium | Low | Validation, testing, monitoring |
| **Sitemap errors** | High | Low | Testing, error handling, logging |

---

## 8. Maintenance Plan

### 8.1 Ongoing Tasks

**Daily**:
- Monitor sitemap generation logs
- Check for structured data errors
- Review Search Console alerts

**Weekly**:
- Update category listing counts
- Review new keyword rankings
- Check for crawl errors
- Analyze traffic trends

**Monthly**:
- Audit structured data validity
- Review and update category descriptions
- Analyze competitor SEO changes
- Update target keywords
- Generate SEO performance report

**Quarterly**:
- Comprehensive SEO audit
- Update SEO strategy based on results
- Review and optimize category structure
- Update documentation

### 8.2 Monitoring Tools

**Required Integrations**:
- Google Search Console (indexing, performance, errors)
- Google Analytics 4 (traffic, conversions, behavior)
- Google Rich Results Test (structured data validation)
- PageSpeed Insights (Core Web Vitals)

**Optional Integrations**:
- Ahrefs/SEMrush (keyword tracking, backlinks)
- Screaming Frog (technical SEO audits)
- Schema.org Validator (structured data)

---

## 9. Next Steps

### 9.1 Immediate Actions

1. **Review & Approval** of this design document
2. **Create Implementation Tickets** for Phase 1
3. **Set up Project Board** with all phases
4. **Assign Resources** (developer time, design input)
5. **Schedule Kick-off Meeting**

### 9.2 Pre-Implementation Checklist

- [ ] Design document approved by stakeholders
- [ ] Database schema reviewed by DBA
- [ ] UI mockups approved (if needed)
- [ ] Development environment prepared
- [ ] Google Search Console access confirmed
- [ ] Backup and rollback plan documented
- [ ] Testing strategy defined

### 9.3 Questions for Stakeholders

1. **Priority**: Which phase should we start with? (Recommendation: Phase 1)
2. **Resources**: How many developer hours per week available?
3. **Timeline**: Is 4-week timeline acceptable or should we compress/extend?
4. **Search Console**: Do we have Google Search Console access set up?
5. **Analytics**: Do we have GA4 configured and tracking properly?
6. **Design**: Do we need UI/UX design input for admin dashboard?
7. **Content**: Who will write category descriptions and FAQ content?

---

## 10. Appendix

### 10.1 SEO Best Practices Reference

**Title Tags**:
- Length: 50-60 characters
- Include primary keyword near the beginning
- Add brand name at the end
- Make it compelling and clickable

**Meta Descriptions**:
- Length: 150-160 characters
- Include primary and secondary keywords naturally
- Include call-to-action
- Unique for each page

**Headings**:
- One H1 per page (primary keyword)
- H2-H6 for subheadings (related keywords)
- Logical hierarchy (don't skip levels)
- Descriptive and keyword-rich

**Internal Linking**:
- Use descriptive anchor text
- Link to related content
- Maintain 3-click rule (any page in 3 clicks from home)
- Update old content with links to new pages

**Structured Data**:
- Use Schema.org vocabulary
- Validate before deploying
- Monitor for errors in Search Console
- Keep data accurate and up-to-date

### 10.2 Category Data Examples

**Popular Subjects**:
```typescript
[
  { name: 'GCSE Maths', slug: 'gcse-maths', href: '/subjects/gcse/maths' },
  { name: 'A-Level Chemistry', slug: 'a-level-chemistry', href: '/subjects/a-level/chemistry' },
  { name: 'Primary English', slug: 'primary-english', href: '/subjects/primary/english' },
  { name: 'Piano Lessons', slug: 'piano', href: '/subjects/music/piano' },
  { name: 'Coding & Programming', slug: 'coding', href: '/subjects/tech/coding' },
  // ... 50+ more
]
```

**Popular Locations**:
```typescript
[
  { name: 'London', slug: 'london', href: '/locations/london' },
  { name: 'Manchester', slug: 'manchester', href: '/locations/manchester' },
  { name: 'Birmingham', slug: 'birmingham', href: '/locations/birmingham' },
  { name: 'Edinburgh', slug: 'edinburgh', href: '/locations/edinburgh' },
  { name: 'Online', slug: 'online', href: '/locations/online' },
  // ... 20+ more
]
```

**Popular Combinations**:
```typescript
[
  { name: 'GCSE Maths Tutors in London', href: '/subjects/gcse/maths?location=london' },
  { name: 'Online A-Level Chemistry Tutors', href: '/subjects/a-level/chemistry?online=true' },
  { name: 'Piano Teachers in Manchester', href: '/subjects/music/piano?location=manchester' },
  // ... 100+ more
]
```

### 10.3 JSON-LD Examples

**Full Homepage Structured Data**:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tutorwise.com/#organization",
      "name": "Tutorwise",
      "url": "https://tutorwise.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tutorwise.com/logo.png",
        "width": 600,
        "height": 60
      },
      "description": "Connect with verified, credible tutors for personalized learning",
      "sameAs": [
        "https://twitter.com/tutorwise",
        "https://www.facebook.com/tutorwise",
        "https://www.linkedin.com/company/tutorwise"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "email": "support@tutorwise.com"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://tutorwise.com/#website",
      "url": "https://tutorwise.com",
      "name": "Tutorwise",
      "publisher": {
        "@id": "https://tutorwise.com/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://tutorwise.com/?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "ItemList",
      "name": "Featured Tutors",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "item": {
            "@type": "Product",
            "name": "GCSE Maths Tutoring",
            "url": "https://tutorwise.com/listings/abc123",
            "offers": {
              "@type": "Offer",
              "price": "30",
              "priceCurrency": "GBP"
            }
          }
        }
      ]
    }
  ]
}
```

### 10.4 References

**Google Documentation**:
- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Structured Data Guidelines](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Sitemap Guidelines](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Rich Results Test](https://search.google.com/test/rich-results)

**Schema.org**:
- [Organization Schema](https://schema.org/Organization)
- [WebSite Schema](https://schema.org/WebSite)
- [BreadcrumbList Schema](https://schema.org/BreadcrumbList)
- [Product Schema](https://schema.org/Product)

**Industry Resources**:
- [Moz Beginner's Guide to SEO](https://moz.com/beginners-guide-to-seo)
- [Ahrefs SEO Guide](https://ahrefs.com/seo)
- [Search Engine Journal](https://www.searchenginejournal.com/)

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-23 | AI Analysis | Initial design document created |

---

**End of SEO Solution Design v1**
