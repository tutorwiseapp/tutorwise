# PublicPageShell Component

**Purpose:** Reusable shell component for all public-facing pages (profiles, organisations, marketplace listings).

**Created:** 2026-01-04
**Based on:** `public-profile` and `public-organisation-profile` layout patterns
**Design System:** Follows Hub component slot-based API philosophy

---

## Features

- ✅ **SEO Metadata Handling** - Structured data, OpenGraph, robots directives
- ✅ **Responsive 2-Column Layout** - 2fr main + 1fr sticky sidebar (desktop), stacked (mobile)
- ✅ **Full-Width Hero Section** - Prominent top section for profile/org hero
- ✅ **View Tracking Integration** - Built-in analytics tracking support
- ✅ **Mobile Bottom CTA** - Fixed bottom call-to-action on mobile
- ✅ **5-Minute Revalidation Caching** - Optimized for Next.js server components
- ✅ **Hub Design System Patterns** - Consistent spacing tokens and responsive breakpoints

---

## Layout Structure

```
┌─────────────────────────────────────────────┐
│         Hero Section (full-width)           │
└─────────────────────────────────────────────┘
┌───────────────────────┬─────────────────────┐
│   Main Column (2fr)   │  Sidebar (1fr)      │
│                       │  ┌───────────────┐  │
│  ┌─────────────────┐  │  │  Widget 1     │  │
│  │  Section 1      │  │  └───────────────┘  │
│  └─────────────────┘  │  ┌───────────────┐  │
│  ┌─────────────────┐  │  │  Widget 2     │  │
│  │  Section 2      │  │  └───────────────┘  │
│  └─────────────────┘  │                     │
│  ┌─────────────────┐  │  (Sticky on desktop)│
│  │  Section 3      │  │                     │
│  └─────────────────┘  │                     │
└───────────────────────┴─────────────────────┘
┌─────────────────────────────────────────────┐
│    Related Section (full-width, optional)   │
└─────────────────────────────────────────────┘
```

---

## Usage

### Basic Example

```tsx
import { PublicPageShell } from '@/app/components/layout/PublicPageShell';

export default async function PublicOrganisationPage({ params }) {
  // Fetch data...
  const organisation = await fetchOrganisation(params.slug);

  return (
    <PublicPageShell
      metadata={{
        title: `${organisation.name} | Tutorwise`,
        description: organisation.tagline,
        canonicalUrl: `https://tutorwise.io/organisation/${organisation.slug}`,
        structuredData: buildStructuredData(organisation),
        ogImage: organisation.avatar_url,
        isIndexable: organisation.allow_indexing,
      }}
      hero={<OrganisationHeroSection organisation={organisation} />}
      mainContent={[
        <AboutCard key="about" organisation={organisation} />,
        <TeamMembersCard key="team" members={members} />,
        <ReviewsCard key="reviews" reviews={reviews} />,
      ]}
      sidebar={[
        <StatsCard key="stats" organisation={organisation} />,
        <VerificationCard key="verification" organisation={organisation} />,
      ]}
      relatedSection={<SimilarOrganisationsCard organisations={similar} />}
      mobileBottomCTA={<MobileBottomCTA organisation={organisation} />}
      viewTracker={<OrganisationViewTracker organisationId={organisation.id} />}
    />
  );
}
```

### Profile Page Example

```tsx
export default async function PublicProfilePage({ params }) {
  const profile = await fetchProfile(params.id);

  return (
    <PublicPageShell
      metadata={{
        title: `${profile.full_name} - ${roleLabel} | Tutorwise`,
        description: profile.bio,
        canonicalUrl: `/public-profile/${profile.id}/${profile.slug}`,
        structuredData: buildProfileStructuredData(profile),
        isIndexable: checkSEOEligibility('profile', profile.id),
      }}
      hero={<ProfileHeroSection profile={profile} />}
      mainContent={[
        <AboutCard key="about" profile={profile} />,
        <ServicesCard key="services" listings={listings} />,
        <ReviewsCard key="reviews" reviews={reviews} />,
      ]}
      sidebar={[
        <VerificationCard key="verification" profile={profile} />,
        <StatsCard key="stats" profile={profile} />,
        <ContactCard key="contact" profile={profile} />,
      ]}
      mobileBottomCTA={<MobileBottomCTA profile={profile} />}
      viewTracker={<ProfileViewTracker profileId={profile.id} />}
    />
  );
}
```

### Marketplace Listing Example

```tsx
export default async function MarketplaceDetailPage({ params }) {
  const listing = await fetchListing(params.id);

  return (
    <PublicPageShell
      metadata={{
        title: `${listing.title} | Tutorwise Marketplace`,
        description: listing.description,
        canonicalUrl: `/marketplace/${listing.id}/${listing.slug}`,
        structuredData: buildListingStructuredData(listing),
        ogImage: listing.image_url,
        isIndexable: listing.is_published,
      }}
      hero={<ListingHeroSection listing={listing} />}
      mainContent={[
        <DescriptionCard key="description" listing={listing} />,
        <FeaturesCard key="features" listing={listing} />,
        <AvailabilityCard key="availability" listing={listing} />,
      ]}
      sidebar={[
        <PriceCard key="price" listing={listing} />,
        <TutorCard key="tutor" tutor={listing.tutor} />,
        <BookingCTA key="booking" listing={listing} />,
      ]}
      relatedSection={<SimilarListingsCard listings={similar} />}
      mobileBottomCTA={<BookingCTA listing={listing} />}
    />
  );
}
```

---

## Props API

### `PublicPageShellProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `metadata` | `PublicPageShellMetadata` | ✅ | SEO metadata and structured data |
| `hero` | `ReactNode` | ✅ | Hero section content (full-width) |
| `mainContent` | `ReactNode[]` | ✅ | Array of sections for main column (2fr) |
| `sidebar` | `ReactNode[]` | ✅ | Array of widgets for sidebar (1fr, sticky) |
| `relatedSection` | `ReactNode` | ❌ | Optional related/similar items section |
| `mobileBottomCTA` | `ReactNode` | ❌ | Fixed bottom CTA on mobile |
| `viewTracker` | `ReactNode` | ❌ | Hidden analytics tracking component |
| `showBottomSpacer` | `boolean` | ❌ | Add bottom spacing (default: `true`) |

### `PublicPageShellMetadata`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | ✅ | Page title for SEO |
| `description` | `string` | ✅ | Meta description (≤160 chars) |
| `canonicalUrl` | `string` | ✅ | Canonical URL for SEO |
| `structuredData` | `object` | ✅ | JSON-LD structured data |
| `ogImage` | `string` | ❌ | OpenGraph image URL |
| `isIndexable` | `boolean` | ✅ | Allow search engine indexing |

---

## Responsive Behavior

### Mobile (≤639px)
- **Layout:** Single column (stacked)
- **Gaps:** 16px between sections
- **Hero:** 16px bottom margin
- **Bottom Spacer:** 120px (for mobile CTA + nav)

### Tablet (640px - 1023px)
- **Layout:** Single column (stacked)
- **Gaps:** 24px between sections
- **Hero:** 24px bottom margin
- **Bottom Spacer:** 120px

### Desktop (≥1024px)
- **Layout:** 2-column grid (2fr main + 1fr sidebar)
- **Gaps:** 32px between columns, 24px between sections
- **Hero:** 32px bottom margin
- **Sidebar:** Sticky (`top: 32px`)
- **Bottom Spacer:** 32px

### Large Desktop (≥1440px)
- **Column Gap:** Enhanced to 32px

---

## Design System Alignment

### Spacing Tokens (Hub Pattern)
- `--space-2`: 16px (mobile gaps)
- `--space-3`: 24px (standard section gaps)
- `--space-4`: 32px (column gaps, hero margins)

### Responsive Breakpoints (Hub Pattern)
- Mobile: `max-width: 639px`
- Tablet: `640px - 1023px`
- Desktop: `min-width: 1024px`
- Large Desktop: `min-width: 1440px`

### Layout Philosophy (Hub Pattern)
- **Slot-based API** - Consumers control content via ReactNode slots
- **Zero business logic** - Pure presentation component
- **Flexible children** - Sections/widgets control their own styling
- **Responsive-first** - Mobile → Tablet → Desktop progressive enhancement

---

## Structured Data Example

```tsx
const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization", // or "Person" for profiles
  "name": organisation.name,
  "description": organisation.bio,
  "url": `https://tutorwise.io/organisation/${organisation.slug}`,
  "logo": organisation.avatar_url,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": organisation.avg_rating,
    "bestRating": 5,
    "ratingCount": organisation.total_reviews
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": organisation.city,
    "addressCountry": "United Kingdom"
  }
};
```

---

## Migration Guide

### Migrating from Custom Layout

**Before:**
```tsx
<Container>
  <script type="application/ld+json" {...} />
  <div className={styles.heroSection}>
    <HeroComponent />
  </div>
  <div className={styles.bodySection}>
    <div className={styles.mainColumn}>
      <Section1 />
      <Section2 />
    </div>
    <div className={styles.sidebarColumn}>
      <Widget1 />
      <Widget2 />
    </div>
  </div>
</Container>
```

**After:**
```tsx
<PublicPageShell
  metadata={{ title, description, canonicalUrl, structuredData, isIndexable }}
  hero={<HeroComponent />}
  mainContent={[<Section1 key="1" />, <Section2 key="2" />]}
  sidebar={[<Widget1 key="1" />, <Widget2 key="2" />]}
/>
```

**Benefits:**
- ✅ 50% less code in page component
- ✅ Consistent layout across all public pages
- ✅ SEO metadata centralized
- ✅ Easier to maintain and update

---

## FAQs

### Q: Can I customize the layout spacing?
**A:** The shell uses CSS custom properties (`--space-2`, `--space-3`, `--space-4`). You can override these globally or wrap the shell in a custom div with scoped CSS variables.

### Q: What if I don't need a sidebar?
**A:** Pass an empty array `sidebar={[]}`. The layout will still render the 2-column grid, but the sidebar will be empty. For a true 1-column layout, you'll need to create a variant or use custom styling.

### Q: Can I add a section between hero and body?
**A:** Currently no. The shell enforces the standard hero → body → related flow. If you need a custom section, consider adding it as the first item in `mainContent`.

### Q: How do I handle mobile-only sections?
**A:** Use CSS media queries in your section component to hide/show content based on viewport width, or conditionally render sections in the `mainContent` array.

---

## File Structure

```
📁 app/components/layout/PublicPageShell/
├── PublicPageShell.tsx          # Main component
├── PublicPageShell.module.css   # Layout styles
├── index.ts                     # Barrel export
└── README.md                    # This file
```

---

## Related Components

- **HubRowCard** - List card pattern for public content
- **HubDetailCard** - Detail card pattern for expanded views
- **HubKanbanBoard** - Kanban board pattern (not used in public pages)
- **Container** - Max-width wrapper used by PublicPageShell

---

## Changelog

**v1.0.0 (2026-01-04)**
- Initial implementation
- Migrated `public-organisation-profile` as proof of concept
- Slot-based API following Hub component patterns
- Responsive 2-column layout with sticky sidebar
- SEO metadata and structured data handling
