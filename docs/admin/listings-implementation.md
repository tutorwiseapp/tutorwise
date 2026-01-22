# Listings Implementation Guide

**Document Version:** 1.1
**Created:** 2025-12-27
**Last Updated:** 2025-12-27
**Status:** Implementation Guide - Applies Bookings Patterns to Listings (Updated with Universal Column Order Standard)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Requirements Analysis](#requirements-analysis)
3. [Implementation Walkthrough](#implementation-walkthrough)
4. [Listings-Specific Adaptations](#listings-specific-adaptations)
5. [Code Comparison: Bookings vs Listings](#code-comparison-bookings-vs-listings)
6. [Known Issues and Fixes](#known-issues-and-fixes)
7. [Testing Checklist](#testing-checklist)

---

## Introduction

### Purpose

This document explains how the **Bookings Reference Implementation** was adapted to create the **Listings feature**. It serves as a guide for applying the same patterns to other admin features (Reviews, Organizations, Referrals).

### Alignment with Bookings

The Listings implementation follows the **exact same architecture** as Bookings:
- ✅ Same file structure (8 files)
- ✅ Same component hierarchy (HubPageLayout → HubDataTable → HubDetailModal)
- ✅ Same toolbar pattern (8 actions)
- ✅ Same responsive breakpoints (768px, 1024px)
- ✅ Same CSS patterns (status badges, mobile cards, modal actions)
- ✅ Same data fetching (React Query, server-side pagination)

### What's Different?

Only the **domain-specific content** differs:
- Column definitions (10 columns for listings vs 10 for bookings)
- Filter types (status, category, location, price vs status, date)
- Advanced filters (views, bookings, ratings, price, features vs booking type, people, amount)
- Detail modal sections (6 sections tailored to listing fields vs booking fields)
- Action buttons (activate, feature, edit, contact vs approve, cancel, refund)

---

## Requirements Analysis

### Listings Domain Model

From `apps/web/src/types/index.ts`:

```typescript
export interface Listing {
  // Identity
  id: string;
  profile_id: string;
  profile?: Profile;

  // Content
  title: string;
  slug: string;
  description: string;
  categories: string[];

  // Service Details
  subjects: string[];
  levels: string[];
  service_types: string[];
  hourly_rate: number;
  location_type: 'online' | 'in_person' | 'hybrid';
  location_city?: string;
  free_trial: boolean;
  available_free_help: boolean;

  // Media
  hero_image_url?: string;
  gallery_image_urls?: string[];
  video_url?: string;

  // Engagement Metrics
  view_count: number;
  booking_count: number;
  average_rating?: number;
  reviews_count: number;

  // Status
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  published_at?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
}
```

### KPI Metrics Required

From `platform_statistics_daily` table:

| Metric Key | Description | Format |
|------------|-------------|--------|
| `listings_total` | Total listings | 1,247 |
| `listings_active` | Published listings | 892 |
| `listings_inactive` | Draft/archived | 355 |
| `listings_published_rate` | % published | 71.5% |
| `listings_views_total` | Total views | 45,291 |
| `listings_bookings_total` | Total bookings from listings | 1,023 |
| `listings_avg_rating` | Average rating | 4.7/5.0 |
| `listings_active_rate` | % active | 71.5% |

### Table Columns Required (10 Total)

**⚠️ CRITICAL**: Follows Universal Column Order Standard: ID → Date → Service → Domain → Actions

| # | Column | Width | Sortable | Description |
|---|--------|-------|----------|-------------|
| 1 | ID | 100px | ✅ | 8-char truncated UUID with # prefix (e.g., #a1b2c3d4), standard font, tooltip shows full UUID |
| 2 | Created | 140px | ✅ | Primary date field (dd MMM yyyy format) |
| 3 | Title | 200px | ✅ | "Service" column - Hero image (48x48) + title + slug |
| 4 | Tutor | 180px | — | Avatar (32x32) + name + email |
| 5 | Subjects | 150px | — | First subject + count badge (e.g., "Mathematics +2") |
| 6 | Status | 120px | ✅ | Rectangular badge (8px border-radius) |
| 7 | Views | 100px | ✅ | Right-aligned number |
| 8 | Bookings | 100px | ✅ | Right-aligned number |
| 9 | Price | 100px | ✅ | £XX/hr, right-aligned |
| 10 | Actions | 100px | — | Three-dot menu with View Details, Edit, Delete |

**Column Order Rationale**:
- **ID** (Column 1): Immediate unique reference for support and debugging
- **Created** (Column 2): Primary temporal context (when was this listing created?)
- **Title** (Column 3): Primary identifier ("Service" in universal standard - what is this listing?)
- **Columns 4-9**: Domain-specific data (tutor, subjects, metrics)
- **Actions** (Column 10): Row-level operations always last

**Changes from Previous Version**:
- ✅ Reordered: Created moved from position 10 → 2
- ✅ Reordered: Title moved from position 2 → 3
- ✅ Updated: ID width from 80px → 100px (universal standard)
- ✅ Updated: Created width from 120px → 140px (universal standard)
- ✅ Updated: Title width from 250px → 200px (universal standard)
- ✅ Removed: Rating column (not needed for listings overview)

### Filters Required

**Toolbar Filters (4)**:
1. Status: All / Draft / Published / Archived
2. Category: All / Academic / Language / Music / Arts / Sports / Other
3. Location: All / Online / In Person / Hybrid
4. Price Range: All / £0-25 / £25-50 / £50-75 / £75+

**Advanced Filters (9)**:
1. Views Range: Min/Max
2. Bookings Range: Min/Max
3. Rating Range: Min (0-5) / Max (0-5)
4. Price Range: Min £ / Max £
5. Featured Only: Checkbox
6. Has Video: Checkbox
7. Has Gallery: Checkbox
8. Created After: Date picker
9. Created Before: Date picker

### Bulk Actions Required (4)

1. **Activate** - Set status to 'published'
2. **Deactivate** - Set status to 'archived'
3. **Feature** - Set is_featured to true
4. **Delete** - Hard delete with confirmation

### Modal Actions Required (7)

1. **Activate/Deactivate** - Toggle based on current status
2. **Feature/Unfeature** - Toggle based on is_featured
3. **Edit Listing** - Navigate to `/tutor/listings/{id}/edit`
4. **Contact Tutor** - Navigate to `/messages?userId={profile_id}`
5. **Change Status** - Radix UI DropdownMenu (draft/published/archived)
6. **Delete** - Hard delete with confirmation

---

## Implementation Walkthrough

### Step 1: Create File Structure

Mirror the bookings file structure exactly:

```
apps/web/src/app/(admin)/admin/listings/
├── page.tsx
├── page.module.css
└── components/
    ├── ListingsTable.tsx
    ├── ListingsTable.module.css
    ├── AdminListingDetailModal.tsx
    ├── AdminListingDetailModal.module.css
    ├── AdvancedFiltersDrawer.tsx
    └── AdvancedFiltersDrawer.module.css
```

### Step 2: Implement Page Component

**Base**: Copy [apps/web/src/app/(admin)/admin/bookings/page.tsx:310](apps/web/src/app/(admin)/admin/bookings/page.tsx#L1-L310)

**Find & Replace**:
- `bookings` → `listings`
- `Bookings` → `Listings`
- `BOOKINGS` → `LISTINGS`

**Update Metrics** (8 total):

```typescript
// Row 1: Listing Counts
const totalListingsMetric = useAdminMetric({ metric: 'listings_total', compareWith: 'last_month' });
const activeListingsMetric = useAdminMetric({ metric: 'listings_active', compareWith: 'last_month' });
const inactiveListingsMetric = useAdminMetric({ metric: 'listings_inactive', compareWith: 'last_month' });
const publishedRateMetric = useAdminMetric({ metric: 'listings_published_rate', compareWith: 'last_month' });

// Row 2: Engagement
const totalViewsMetric = useAdminMetric({ metric: 'listings_views_total', compareWith: 'last_month' });
const totalBookingsMetric = useAdminMetric({ metric: 'listings_bookings_total', compareWith: 'last_month' });
const avgRatingMetric = useAdminMetric({ metric: 'listings_avg_rating', compareWith: 'last_month' });
const activeRateMetric = useAdminMetric({ metric: 'listings_active_rate', compareWith: 'last_month' });
```

**Update Charts** (3 total):

```typescript
// Chart 1: Listing Trends
<HubTrendChart
  title="Listing Trends"
  data={listingTrendsData}
  loading={listingTrendsLoading}
  emptyMessage="No listing data available"
/>

// Chart 2: Status Breakdown
<HubCategoryBreakdownChart
  title="Status Breakdown"
  data={listingStatusData}
  loading={listingStatusLoading}
/>

// Chart 3: Engagement Trends
<HubTrendChart
  title="Engagement Trends"
  data={engagementTrendsData}
  loading={engagementTrendsLoading}
  valueFormatter={(value) => value.toLocaleString()}
/>
```

### Step 3: Implement Table Component

**Base**: Copy [apps/web/src/app/(admin)/admin/bookings/components/BookingsTable.tsx:892](apps/web/src/app/(admin)/admin/bookings/components/BookingsTable.tsx#L1-L892)

**Key Changes**:

#### 3.1 Update Imports

```typescript
import { Listing } from '@/types';
import AdminListingDetailModal from './AdminListingDetailModal';
import AdvancedFiltersDrawer, { AdvancedFilters } from './AdvancedFiltersDrawer';
```

#### 3.2 Update State

```typescript
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(20);
const [sortKey, setSortKey] = useState<string>('created_at');  // ✅ Changed from 'session_start_time'
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [categoryFilter, setCategoryFilter] = useState('');
const [locationFilter, setLocationFilter] = useState('');
const [priceFilter, setPriceFilter] = useState('');
const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
  minViews: undefined,
  maxViews: undefined,
  minBookings: undefined,
  maxBookings: undefined,
  minRating: undefined,
  maxRating: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  isFeatured: false,
  hasVideo: false,
  hasGallery: false,
  createdAfter: '',
  createdBefore: '',
});

const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);
```

#### 3.3 Update Query

```typescript
const { data: listingsData, isLoading, error, refetch } = useQuery({
  queryKey: [
    'admin-listings',
    page,
    limit,
    sortKey,
    sortDirection,
    searchQuery,
    statusFilter,
    categoryFilter,
    locationFilter,
    priceFilter,
    advancedFilters,
  ],
  queryFn: async () => {
    let query = supabase
      .from('listings')
      .select(`
        *,
        profile:profiles!profile_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' });

    // Apply search filter (title, description)
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      query = query.contains('categories', [categoryFilter]);
    }

    // Apply location filter
    if (locationFilter) {
      query = query.eq('location_type', locationFilter);
    }

    // Apply price filter
    if (priceFilter) {
      const priceRanges = {
        '0-25': { min: 0, max: 25 },
        '25-50': { min: 25, max: 50 },
        '50-75': { min: 50, max: 75 },
        '75+': { min: 75, max: 999999 },
      };
      const range = priceRanges[priceFilter as keyof typeof priceRanges];
      if (range) {
        query = query.gte('hourly_rate', range.min).lte('hourly_rate', range.max);
      }
    }

    // Apply advanced filters
    if (advancedFilters.minViews !== undefined) {
      query = query.gte('view_count', advancedFilters.minViews);
    }
    if (advancedFilters.maxViews !== undefined) {
      query = query.lte('view_count', advancedFilters.maxViews);
    }
    if (advancedFilters.minBookings !== undefined) {
      query = query.gte('booking_count', advancedFilters.minBookings);
    }
    if (advancedFilters.maxBookings !== undefined) {
      query = query.lte('booking_count', advancedFilters.maxBookings);
    }
    if (advancedFilters.minRating !== undefined) {
      query = query.gte('average_rating', advancedFilters.minRating);
    }
    if (advancedFilters.maxRating !== undefined) {
      query = query.lte('average_rating', advancedFilters.maxRating);
    }
    if (advancedFilters.minPrice !== undefined) {
      query = query.gte('hourly_rate', advancedFilters.minPrice);
    }
    if (advancedFilters.maxPrice !== undefined) {
      query = query.lte('hourly_rate', advancedFilters.maxPrice);
    }
    if (advancedFilters.isFeatured) {
      query = query.eq('is_featured', true);
    }
    if (advancedFilters.hasVideo) {
      query = query.not('video_url', 'is', null);
    }
    if (advancedFilters.hasGallery) {
      query = query.not('gallery_image_urls', 'is', null);
    }
    if (advancedFilters.createdAfter) {
      query = query.gte('created_at', new Date(advancedFilters.createdAfter).toISOString());
    }
    if (advancedFilters.createdBefore) {
      query = query.lte('created_at', new Date(advancedFilters.createdBefore).toISOString());
    }

    // Apply sorting
    query = query.order(sortKey, { ascending: sortDirection === 'asc' });

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data
    const listings = (data || []).map((item: any) => ({
      ...item,
      profile: Array.isArray(item.profile) ? item.profile[0] : item.profile,
    })) as Listing[];

    return {
      listings,
      total: count || 0,
    };
  },
  staleTime: 60 * 1000,
  retry: 2,
});
```

#### 3.4 Define Columns (10 Columns)

```typescript
const columns: Column<Listing>[] = [
  // 1. ID Column
  {
    key: 'id',
    label: 'ID',
    width: '80px',
    sortable: true,
    render: (listing) => (
      <span className={styles.idCell}>
        #{listing.id.slice(0, 8)}
      </span>
    ),
  },

  // 2. Title Column (with image)
  {
    key: 'title',
    label: 'Title',
    width: '250px',
    sortable: true,
    render: (listing) => (
      <div className={styles.titleCell}>
        {listing.hero_image_url && (
          <img
            src={listing.hero_image_url}
            alt={listing.title}
            className={styles.listingImage}
          />
        )}
        <div className={styles.titleInfo}>
          <div className={styles.listingTitle}>{listing.title}</div>
          <div className={styles.listingSlug}>{listing.slug}</div>
        </div>
      </div>
    ),
  },

  // 3. Tutor Column (with avatar)
  {
    key: 'tutor',
    label: 'Tutor',
    width: '150px',
    render: (listing) => (
      <div className={styles.tutorCell}>
        {listing.profile?.avatar_url && (
          <img
            src={listing.profile.avatar_url}
            alt={listing.profile.full_name}
            className={styles.tutorAvatar}
          />
        )}
        <div className={styles.tutorInfo}>
          <div className={styles.tutorName}>{listing.profile?.full_name || 'N/A'}</div>
          <div className={styles.tutorEmail}>{listing.profile?.email || ''}</div>
        </div>
      </div>
    ),
  },

  // 4. Subjects Column (first subject + count)
  {
    key: 'subjects',
    label: 'Subjects',
    width: '200px',
    render: (listing) => {
      if (!listing.subjects || listing.subjects.length === 0) {
        return <span className={styles.noSubjects}>—</span>;
      }
      const firstSubject = listing.subjects[0];
      const remainingCount = listing.subjects.length - 1;
      return (
        <div className={styles.subjectsCell}>
          <span className={styles.subjectBadge}>{firstSubject}</span>
          {remainingCount > 0 && (
            <span className={styles.subjectCount}>+{remainingCount}</span>
          )}
        </div>
      );
    },
  },

  // 5. Status Column (rectangular badge)
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    render: (listing) => (
      <span className={`${styles.statusBadge} ${styles[`status${listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}`]}`}>
        {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
      </span>
    ),
  },

  // 6. Views Column (right-aligned)
  {
    key: 'view_count',
    label: 'Views',
    width: '100px',
    sortable: true,
    render: (listing) => (
      <span className={styles.numericCell}>
        {listing.view_count.toLocaleString()}
      </span>
    ),
  },

  // 7. Bookings Column (right-aligned)
  {
    key: 'booking_count',
    label: 'Bookings',
    width: '100px',
    sortable: true,
    render: (listing) => (
      <span className={styles.numericCell}>
        {listing.booking_count.toLocaleString()}
      </span>
    ),
  },

  // 8. Rating Column (star icon + value)
  {
    key: 'average_rating',
    label: 'Rating',
    width: '100px',
    sortable: true,
    render: (listing) => (
      <div className={styles.ratingCell}>
        <Star className={styles.starIcon} size={14} fill="#facc15" stroke="#facc15" />
        <span className={styles.ratingValue}>
          {listing.average_rating ? listing.average_rating.toFixed(1) : 'N/A'}
        </span>
      </div>
    ),
  },

  // 9. Price Column (right-aligned)
  {
    key: 'hourly_rate',
    label: 'Price',
    width: '100px',
    sortable: true,
    render: (listing) => (
      <span className={styles.priceCell}>
        £{listing.hourly_rate}/hr
      </span>
    ),
  },

  // 10. Created Column (date only)
  {
    key: 'created_at',
    label: 'Created',
    width: '120px',
    sortable: true,
    render: (listing) => (
      <span className={styles.dateCell}>
        {new Date(listing.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </span>
    ),
  },
];
```

#### 3.5 Define Filters (4 Toolbar Filters)

```typescript
const filters: Filter[] = [
  {
    key: 'status',
    label: 'All Statuses',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
      { label: 'Archived', value: 'archived' },
    ],
  },
  {
    key: 'category',
    label: 'All Categories',
    options: [
      { label: 'Academic', value: 'academic' },
      { label: 'Language', value: 'language' },
      { label: 'Music', value: 'music' },
      { label: 'Arts', value: 'arts' },
      { label: 'Sports', value: 'sports' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    key: 'location',
    label: 'All Locations',
    options: [
      { label: 'Online', value: 'online' },
      { label: 'In Person', value: 'in_person' },
      { label: 'Hybrid', value: 'hybrid' },
    ],
  },
  {
    key: 'price',
    label: 'All Prices',
    options: [
      { label: '£0-25', value: '0-25' },
      { label: '£25-50', value: '25-50' },
      { label: '£50-75', value: '50-75' },
      { label: '£75+', value: '75+' },
    ],
  },
];
```

#### 3.6 Define Bulk Actions (4 Actions)

```typescript
const bulkActions: BulkAction[] = [
  {
    label: 'Activate',
    value: 'activate',
    onClick: async (selectedIds) => {
      if (!confirm(`Activate ${selectedIds.length} listings?`)) return;
      await supabase
        .from('listings')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'primary',
  },
  {
    label: 'Deactivate',
    value: 'deactivate',
    onClick: async (selectedIds) => {
      if (!confirm(`Deactivate ${selectedIds.length} listings?`)) return;
      await supabase
        .from('listings')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'secondary',
  },
  {
    label: 'Feature',
    value: 'feature',
    onClick: async (selectedIds) => {
      if (!confirm(`Feature ${selectedIds.length} listings?`)) return;
      await supabase
        .from('listings')
        .update({
          is_featured: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'secondary',
  },
  {
    label: 'Delete',
    value: 'delete',
    onClick: async (selectedIds) => {
      if (!confirm(`DELETE ${selectedIds.length} listings? This cannot be undone.`)) return;
      await supabase.from('listings').delete().in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'danger',
  },
];
```

### Step 4: Implement Detail Modal

**Base**: Copy [apps/web/src/app/(admin)/admin/bookings/components/AdminBookingDetailModal.tsx:410](apps/web/src/app/(admin)/admin/bookings/components/AdminBookingDetailModal.tsx#L1-L410)

**Update Sections** (6 total):

```typescript
const sections: DetailSection[] = [
  {
    title: 'Basic Information',
    fields: [
      { label: 'Title', value: listing.title },
      { label: 'Slug', value: listing.slug },
      { label: 'Status', value: listing.status },
      { label: 'Description', value: listing.description || 'N/A' },
      { label: 'Categories', value: listing.categories?.join(', ') || 'N/A' },
      { label: 'Featured', value: listing.is_featured ? 'Yes' : 'No' },
    ],
  },
  {
    title: 'Service Details',
    fields: [
      { label: 'Subjects', value: listing.subjects?.join(', ') || 'N/A' },
      { label: 'Levels', value: listing.levels?.join(', ') || 'N/A' },
      { label: 'Service Types', value: listing.service_types?.join(', ') || 'N/A' },
      { label: 'Hourly Rate', value: `£${listing.hourly_rate}/hr` },
      { label: 'Location Type', value: listing.location_type || 'N/A' },
      { label: 'Location City', value: listing.location_city || 'N/A' },
      { label: 'Free Trial', value: listing.free_trial ? 'Yes' : 'No' },
      { label: 'Free Help Available', value: listing.available_free_help ? 'Yes' : 'No' },
    ],
  },
  {
    title: 'Tutor Information',
    fields: [
      { label: 'Tutor Name', value: listing.profile?.full_name || 'N/A' },
      { label: 'Tutor Email', value: listing.profile?.email || 'N/A' },
      { label: 'Tutor ID', value: listing.profile_id },
    ],
  },
  {
    title: 'Engagement Metrics',
    fields: [
      { label: 'View Count', value: listing.view_count?.toString() || '0' },
      { label: 'Booking Count', value: listing.booking_count?.toString() || '0' },
      { label: 'Average Rating', value: listing.average_rating ? `${listing.average_rating.toFixed(1)}/5.0` : 'N/A' },
      { label: 'Reviews Count', value: listing.reviews_count?.toString() || '0' },
    ],
  },
  {
    title: 'Media',
    fields: [
      { label: 'Hero Image', value: listing.hero_image_url || 'N/A' },
      { label: 'Gallery Images', value: listing.gallery_image_urls ? `${listing.gallery_image_urls.length} images` : 'None' },
      { label: 'Video URL', value: listing.video_url || 'N/A' },
    ],
  },
  {
    title: 'System Information',
    fields: [
      { label: 'Listing ID', value: listing.id },
      { label: 'Created At', value: formatDateTime(listing.created_at) },
      { label: 'Updated At', value: listing.updated_at ? formatDateTime(listing.updated_at) : 'N/A' },
      { label: 'Last Published', value: listing.published_at ? formatDateTime(listing.published_at) : 'Never' },
    ],
  },
];
```

**Update Actions** (7 total):

```typescript
actions={
  <div className={styles.actionsWrapper}>
    {/* 1. Activate/Deactivate */}
    {listing.status === 'published' ? (
      <Button variant="secondary" onClick={handleDeactivate} disabled={isProcessing}>
        <XCircle className={styles.buttonIcon} />
        Deactivate
      </Button>
    ) : (
      <Button variant="primary" onClick={handleActivate} disabled={isProcessing}>
        <CheckCircle className={styles.buttonIcon} />
        Activate
      </Button>
    )}

    {/* 2. Feature/Unfeature */}
    {listing.is_featured ? (
      <Button variant="secondary" onClick={handleUnfeature} disabled={isProcessing}>
        <StarOff className={styles.buttonIcon} />
        Unfeature
      </Button>
    ) : (
      <Button variant="secondary" onClick={handleFeature} disabled={isProcessing}>
        <Star className={styles.buttonIcon} />
        Feature
      </Button>
    )}

    {/* 3. Edit Listing */}
    <Button variant="secondary" onClick={handleEditListing}>
      <Edit className={styles.buttonIcon} />
      Edit Listing
    </Button>

    {/* 4. Contact Tutor */}
    <Button variant="secondary" onClick={handleContactTutor}>
      <MessageSquare className={styles.buttonIcon} />
      Contact Tutor
    </Button>

    {/* 5. Change Status Dropdown */}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" disabled={isProcessing}>
          <Settings className={styles.buttonIcon} />
          Change Status
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.statusDropdownContent} sideOffset={5} align="start">
          {['draft', 'published', 'archived'].map((status) => (
            <DropdownMenu.Item
              key={status}
              className={styles.statusDropdownItem}
              disabled={listing.status === status || isProcessing}
              onSelect={() => handleChangeStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {listing.status === status && (
                <span className={styles.currentStatusBadge}>(Current)</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>

    {/* 6. Delete */}
    <Button variant="danger" onClick={handleDelete} disabled={isProcessing}>
      <Trash2 className={styles.buttonIcon} />
      Delete
    </Button>
  </div>
}
```

### Step 5: Implement Advanced Filters Drawer

**Base**: Copy bookings AdvancedFiltersDrawer

**Update Interface**:

```typescript
export interface AdvancedFilters {
  minViews?: number;
  maxViews?: number;
  minBookings?: number;
  maxBookings?: number;
  minRating?: number;
  maxRating?: number;
  minPrice?: number;
  maxPrice?: number;
  isFeatured: boolean;
  hasVideo: boolean;
  hasGallery: boolean;
  createdAfter: string;
  createdBefore: string;
}
```

**Update Drawer Sections** (4 sections, 9 filters total):

```typescript
{/* Engagement Metrics Section */}
<div className={styles.filterSection}>
  <h3 className={styles.sectionTitle}>Engagement Metrics</h3>

  {/* Views Range */}
  <div className={styles.filterRow}>
    <label className={styles.filterLabel}>View Count</label>
    <div className={styles.rangeInputs}>
      <input type="number" placeholder="Min" value={localFilters.minViews || ''} onChange={...} className={styles.filterInput} />
      <span className={styles.rangeSeparator}>to</span>
      <input type="number" placeholder="Max" value={localFilters.maxViews || ''} onChange={...} className={styles.filterInput} />
    </div>
  </div>

  {/* Bookings Range */}
  <div className={styles.filterRow}>
    <label className={styles.filterLabel}>Booking Count</label>
    <div className={styles.rangeInputs}>
      <input type="number" placeholder="Min" value={localFilters.minBookings || ''} onChange={...} className={styles.filterInput} />
      <span className={styles.rangeSeparator}>to</span>
      <input type="number" placeholder="Max" value={localFilters.maxBookings || ''} onChange={...} className={styles.filterInput} />
    </div>
  </div>

  {/* Rating Range */}
  <div className={styles.filterRow}>
    <label className={styles.filterLabel}>Rating</label>
    <div className={styles.rangeInputs}>
      <input type="number" step="0.1" min="0" max="5" placeholder="Min (0-5)" value={localFilters.minRating || ''} onChange={...} className={styles.filterInput} />
      <span className={styles.rangeSeparator}>to</span>
      <input type="number" step="0.1" min="0" max="5" placeholder="Max (0-5)" value={localFilters.maxRating || ''} onChange={...} className={styles.filterInput} />
    </div>
  </div>
</div>

{/* Pricing Section */}
<div className={styles.filterSection}>
  <h3 className={styles.sectionTitle}>Pricing</h3>
  <div className={styles.filterRow}>
    <label className={styles.filterLabel}>Hourly Rate (£)</label>
    <div className={styles.rangeInputs}>
      <input type="number" placeholder="Min" value={localFilters.minPrice || ''} onChange={...} className={styles.filterInput} />
      <span className={styles.rangeSeparator}>to</span>
      <input type="number" placeholder="Max" value={localFilters.maxPrice || ''} onChange={...} className={styles.filterInput} />
    </div>
  </div>
</div>

{/* Features Section */}
<div className={styles.filterSection}>
  <h3 className={styles.sectionTitle}>Features</h3>

  <div className={styles.checkboxRow}>
    <input type="checkbox" id="isFeatured" checked={localFilters.isFeatured} onChange={...} className={styles.checkbox} />
    <label htmlFor="isFeatured" className={styles.checkboxLabel}>Featured listings only</label>
  </div>

  <div className={styles.checkboxRow}>
    <input type="checkbox" id="hasVideo" checked={localFilters.hasVideo} onChange={...} className={styles.checkbox} />
    <label htmlFor="hasVideo" className={styles.checkboxLabel}>Has video</label>
  </div>

  <div className={styles.checkboxRow}>
    <input type="checkbox" id="hasGallery" checked={localFilters.hasGallery} onChange={...} className={styles.checkbox} />
    <label htmlFor="hasGallery" className={styles.checkboxLabel}>Has gallery images</label>
  </div>
</div>

{/* Date Range Section */}
<div className={styles.filterSection}>
  <h3 className={styles.sectionTitle}>Date Range</h3>

  <div className={styles.filterRow}>
    <label className={styles.filterLabel}>Created After</label>
    <input type="date" value={localFilters.createdAfter} onChange={...} className={styles.filterInput} />
  </div>

  <div className={styles.filterRow}>
    <label className={styles.filterLabel}>Created Before</label>
    <input type="date" value={localFilters.createdBefore} onChange={...} className={styles.filterInput} />
  </div>
</div>
```

### Step 6: Copy CSS Modules

**page.module.css**: Copy from bookings, replace `bookings` → `listings`

**AdminListingDetailModal.module.css**: Exact copy from [apps/web/src/app/(admin)/admin/bookings/components/AdminBookingDetailModal.module.css:82](apps/web/src/app/(admin)/admin/bookings/components/AdminBookingDetailModal.module.css#L1-L82)

**AdvancedFiltersDrawer.module.css**: Copy from bookings (no changes needed)

**ListingsTable.module.css**: Create new file with listing-specific styles:

```css
/* ID Cell - Monospace */
.idCell {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8125rem;
  color: #6b7280;
}

/* Title Cell - Flex with image */
.titleCell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.listingImage {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
  object-fit: cover;
}

.titleInfo {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.listingTitle {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.listingSlug {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Tutor Cell - Flex with avatar */
.tutorCell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tutorAvatar {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  object-fit: cover;
}

.tutorInfo {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.tutorName {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.tutorEmail {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Subjects Cell - First subject + count */
.subjectsCell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subjectBadge {
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.subjectCount {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.noSubjects {
  color: #9ca3af;
}

/* Status Badge - Rectangular (8px border-radius) */
.statusBadge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;  /* ✅ 8px, NOT 9999px */
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.statusDraft {
  background: #fef3c7;
  color: #92400e;
}

.statusPublished {
  background: #d1fae5;
  color: #065f46;
}

.statusArchived {
  background: #f3f4f6;
  color: #374151;
}

/* Numeric Cells - Right-aligned */
.numericCell {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  color: #1f2937;
}

/* Rating Cell - Star icon + value */
.ratingCell {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.starIcon {
  flex-shrink: 0;
}

.ratingValue {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

/* Price Cell - Right-aligned */
.priceCell {
  text-align: right;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

/* Date Cell */
.dateCell {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Advanced Filters Button */
.filtersButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filtersButton:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.filtersButton.active {
  background: #006c67;
  border-color: #006c67;
  color: #ffffff;
}

.filtersBadge {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 9999px;
  border: 2px solid #ffffff;
}

/* Mobile Cards */
.mobileCard {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobileCard:hover {
  border-color: #006c67;
  box-shadow: 0 2px 8px rgba(0, 108, 103, 0.1);
}

.mobileCardHeader {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.mobileCardImage {
  width: 64px;
  height: 64px;
  border-radius: 0.375rem;
  object-fit: cover;
}

.mobileCardTitle {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.mobileCardBody {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobileCardRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.mobileCardMetrics {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}
```

---

## Listings-Specific Adaptations

### What Changed from Bookings?

| Aspect | Bookings | Listings |
|--------|----------|----------|
| **Primary entity** | Booking | Listing |
| **Default sort** | `session_start_time` DESC | `created_at` DESC |
| **Search fields** | ID, service, client, tutor | Title, description |
| **Toolbar filters** | Status, Date | Status, Category, Location, Price |
| **Advanced filters** | Booking type, Client, Agent, Tutor, Amount | Views, Bookings, Rating, Price, Featured, Video, Gallery, Date range |
| **Bulk actions** | Approve, Export, Cancel | Activate, Deactivate, Feature, Delete |
| **Modal actions** | Approve/Cancel, Refund, View Listing, Contact Client, Change Status, Delete | Activate/Deactivate, Feature/Unfeature, Edit, Contact Tutor, Change Status, Delete |
| **Detail sections** | Session, Client, Tutor, Agent, Booking, System (6) | Basic, Service, Tutor, Engagement, Media, System (6) |
| **Status values** | Pending, Confirmed, Completed, Cancelled | draft, published, archived |
| **Badge shape** | Rectangular (8px) | Rectangular (8px) |

### What Stayed the Same?

- File structure (8 files)
- Component hierarchy (HubPageLayout → HubDataTable → HubDetailModal)
- Toolbar pattern (8 actions)
- Responsive breakpoints (768px, 1024px)
- CSS module patterns (status badges, mobile cards, modal actions)
- React Query configuration (staleTime, retry)
- Pagination logic (server-side)
- Radix UI dropdown pattern
- Mobile card layout
- Auto-refresh interval (30s)
- Saved views localStorage key pattern

---

## Code Comparison: Bookings vs Listings

### Query Pattern

**Bookings**:
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['admin-bookings', page, limit, sortKey, sortDirection, searchQuery, statusFilter, dateFilter, advancedFilters],
  queryFn: async () => {
    let query = supabase.from('bookings').select(`*, client:profiles!bookings_client_id_fkey(...)`);
    // ... filters
    return { bookings: data, total: count };
  },
});
```

**Listings**:
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['admin-listings', page, limit, sortKey, sortDirection, searchQuery, statusFilter, categoryFilter, locationFilter, priceFilter, advancedFilters],
  queryFn: async () => {
    let query = supabase.from('listings').select(`*, profile:profiles!profile_id(...)`);
    // ... filters
    return { listings: data, total: count };
  },
});
```

**Pattern**: Same structure, different table name and foreign key.

### Column Rendering

**Bookings (Date Column)**:
```typescript
{
  key: 'session_start_time',
  label: 'Date',
  width: '140px',
  sortable: true,
  render: (booking) => {
    const date = new Date(booking.session_start_time);
    return (
      <div className={styles.dateCell}>
        <div className={styles.date}>{date.toLocaleDateString('en-GB')}</div>
        <div className={styles.time}>{date.toLocaleTimeString('en-GB')}</div>
      </div>
    );
  },
}
```

**Listings (Subjects Column)**:
```typescript
{
  key: 'subjects',
  label: 'Subjects',
  width: '200px',
  render: (listing) => {
    if (!listing.subjects || listing.subjects.length === 0) {
      return <span className={styles.noSubjects}>—</span>;
    }
    const firstSubject = listing.subjects[0];
    const remainingCount = listing.subjects.length - 1;
    return (
      <div className={styles.subjectsCell}>
        <span className={styles.subjectBadge}>{firstSubject}</span>
        {remainingCount > 0 && <span className={styles.subjectCount}>+{remainingCount}</span>}
      </div>
    );
  },
}
```

**Pattern**: Different rendering logic, same Column<T> interface.

### Status Badge

**Bookings**:
```typescript
.statusPending { background: #fef3c7; color: #92400e; }
.statusConfirmed { background: #dbeafe; color: #1e40af; }
.statusCompleted { background: #d1fae5; color: #065f46; }
.statusCancelled { background: #fee2e2; color: #991b1b; }
```

**Listings**:
```typescript
.statusDraft { background: #fef3c7; color: #92400e; }
.statusPublished { background: #d1fae5; color: #065f46; }
.statusArchived { background: #f3f4f6; color: #374151; }
```

**Pattern**: Same badge structure (`border-radius: 0.5rem`), different status values and colors.

---

## Known Issues and Fixes

### Issue 1: Status Badge Shape

**Problem**: Initial implementation used `border-radius: 9999px` (pill-shaped).

**Fix**:
```css
.statusBadge {
  border-radius: 0.5rem;  /* ✅ Changed from 9999px to 8px */
}
```

### Issue 2: Advanced Filters Button

**Problem**: Button showed "Advanced Filters" text, should be icon-only.

**Fix**:
```typescript
<button className={styles.filtersButton} onClick={() => setIsDrawerOpen(true)}>
  <FilterIcon size={16} />  {/* ✅ Icon only, no text */}
  {hasActiveFilters && <span className={styles.filtersBadge}>{activeFilterCount}</span>}
</button>
```

### Issue 3: Default Filter Values

**Problem**: Filters showed placeholder text, should show "All ...".

**Fix**:
```typescript
const filters: Filter[] = [
  { key: 'status', label: 'All Statuses', options: [...] },  // ✅ Label shows "All"
  { key: 'category', label: 'All Categories', options: [...] },
  { key: 'location', label: 'All Locations', options: [...] },
  { key: 'price', label: 'All Prices', options: [...] },
];
```

### Issue 4: Missing Actions Column

**Problem**: Table only had 9 columns, missing three-dot Actions column.

**Fix**: Add Actions column as 11th column (after Created):

```typescript
{
  key: 'actions',
  label: 'Actions',
  width: '100px',
  render: (listing) => (
    <div className={styles.actionsCell}>
      <button className={styles.actionsButton} onClick={(e) => { /* ... */ }}>
        <MoreVertical size={16} />
      </button>
      {/* Dropdown menu */}
    </div>
  ),
}
```

### Issue 5: Subjects Display

**Problem**: Subjects column showed all subjects as tags, wrapped to multiple lines.

**Fix**: Show first subject + count badge on single line:

```typescript
render: (listing) => {
  if (!listing.subjects || listing.subjects.length === 0) {
    return <span className={styles.noSubjects}>—</span>;
  }
  const firstSubject = listing.subjects[0];
  const remainingCount = listing.subjects.length - 1;
  return (
    <div className={styles.subjectsCell}>
      <span className={styles.subjectBadge}>{firstSubject}</span>
      {remainingCount > 0 && <span className={styles.subjectCount}>+{remainingCount}</span>}
    </div>
  );
}
```

### Issue 6: Search Input Width

**Problem**: Search input wider than bookings.

**Fix**: Ensure consistent width across all admin tables:

```css
/* In HubDataTable.module.css (global) */
.searchInput {
  width: 100%;
  max-width: 320px;  /* ✅ Consistent width */
  padding: 0.625rem 0.875rem 0.625rem 2.5rem;
  /* ... */
}
```

### Issue 7: Incorrect Edit Listing Route (404 Error)

**Problem**: Edit Listing action in the dropdown menu used an assumed route structure that didn't exist, resulting in 404 errors.

**Original (incorrect) code**:
```typescript
// ❌ WRONG: Assumed route structure without verification
window.location.href = `/tutor/listings/${listing.id}/edit`;  // Results in 404
```

**Root cause**: Route was implemented based on assumption instead of searching the codebase to find the actual route structure.

**Fix Process**:
1. **Search for actual edit listing route**:
   ```bash
   # Used Glob to find: **/edit-listing/[id]/page.tsx
   # Found: apps/web/src/app/edit-listing/[id]/page.tsx
   ```

2. **Read route file to confirm**:
   ```typescript
   // File exists at: /Users/.../app/edit-listing/[id]/page.tsx
   // Uses dynamic route parameter: [id]
   ```

3. **Update with verified route**:
   ```typescript
   // ✅ CORRECT: Verified route from codebase search
   window.location.href = `/edit-listing/${listing.id}`;  // Works correctly
   ```

**Lesson Learned**: **NEVER assume route structures**. Always:
1. Search codebase using Glob/Grep for the actual route file
2. Read the route file to confirm structure and parameters
3. Use the verified route in implementation
4. Test navigation in development

**Location of fix**: `ListingsTable.tsx:461` (Edit Listing button in actions dropdown)

**Prevention**: This issue is now documented as **Pitfall 9** in the Feature Page Implementation Template, with a comprehensive checklist for route verification.

---

## Testing Checklist

Use the same checklist as Bookings Implementation, replacing "booking" with "listing".

### Desktop (1024px+)

- [ ] Table displays all 10 columns correctly
- [ ] ID column shows first 8 chars, standard font
- [ ] Title column shows hero image (48x48) + title + slug
- [ ] Tutor column shows avatar (32x32) + name + email
- [ ] Subjects column shows "Mathematics +2" format (first subject + count)
- [ ] Status badge is rectangular (8px border-radius)
- [ ] Views, Bookings columns right-aligned
- [ ] Rating column shows star icon + value (x.x)
- [ ] Price column shows "£XX/hr", right-aligned
- [ ] Created column shows dd/mm/yyyy
- [ ] Search filters by title, description
- [ ] Status filter dropdown works (All / Draft / Published / Archived)
- [ ] Category filter dropdown works (All / Academic / Language / Music / Arts / Sports / Other)
- [ ] Location filter dropdown works (All / Online / In Person / Hybrid)
- [ ] Price filter dropdown works (All / £0-25 / £25-50 / £50-75 / £75+)
- [ ] Advanced Filters button is icon-only with badge count
- [ ] Advanced filters drawer opens and applies correctly
- [ ] Bulk select checkbox selects all visible rows
- [ ] Bulk actions dropdown appears when rows selected (Activate, Deactivate, Feature, Delete)
- [ ] Auto-refresh toggle enables/disables 30s refresh
- [ ] Saved views save/load/delete correctly
- [ ] CSV export downloads correct data
- [ ] Row click opens detail modal
- [ ] Detail modal displays all 6 sections correctly (Basic, Service, Tutor, Engagement, Media, System)
- [ ] All 7 action buttons work (Activate/Deactivate, Feature/Unfeature, Edit, Contact Tutor, Change Status, Delete)
- [ ] Change Status dropdown works (Radix UI)
- [ ] Keyboard shortcuts work (⌘K search, ⌘R refresh, Esc clear)

### Tablet (768-1023px)

- [ ] Table layout matches desktop
- [ ] Charts grid displays 2 columns
- [ ] Sidebar visible on right

### Mobile (<768px)

- [ ] Table switches to card layout
- [ ] Mobile cards show hero image, title, status, tutor, subjects, metrics, price, date
- [ ] Charts grid displays 1 column
- [ ] Sidebar becomes floating button + drawer
- [ ] Modal actions display 2 per row
- [ ] Advanced Filters drawer full-width

### Data Integrity

- [ ] Pagination shows correct total count
- [ ] Sorting works on all sortable columns
- [ ] Search returns correct results
- [ ] Filters combine correctly (AND logic)
- [ ] Foreign key join returns correct profile
- [ ] Advanced filters apply correctly

### Performance

- [ ] Initial load <2s
- [ ] Table fetch <1s
- [ ] Auto-refresh no UI jank

---

## Summary

The Listings implementation successfully **applies all Bookings patterns** to a different domain:

1. ✅ Same file structure (8 files)
2. ✅ Same component hierarchy (HubPageLayout → HubDataTable → HubDetailModal)
3. ✅ Same toolbar pattern (8 actions)
4. ✅ Same responsive design (768px, 1024px breakpoints)
5. ✅ Same data fetching (React Query, server-side pagination)
6. ✅ Same CSS patterns (rectangular status badges, mobile cards, 2-column modal actions)
7. ✅ Same Radix UI dropdown pattern (Change Status)
8. ✅ Same advanced filters drawer pattern

**Key Takeaway**: The hub architecture is **domain-agnostic**. By following the Bookings reference implementation, we created a complete Listings feature in ~2,378 lines of code with **zero architectural deviations**.

**Next Steps**: Use this guide to implement Reviews, Organizations, and Referrals features using the same patterns.

---

**End of Listings Implementation Guide Document**

Next: [Feature Page Implementation Template](./feature-page-template.md)
