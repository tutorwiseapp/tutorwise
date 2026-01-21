# Public Organisation Profile - Design System Alignment Plan

## Executive Summary
The OrganisationHeroSection has been successfully redesigned to match the design system standards. This document outlines the comprehensive plan to align all remaining components on the public organisation profile page to match the hero section's design quality.

---

## Current State Analysis

### ✅ Already Completed: OrganisationHeroSection
**Design System Compliance:**
- CSS Grid layout (grid-template-columns: auto 1fr auto)
- Teal color palette (#006c67, #005550, #E6F0F0)
- Standardized spacing (40px padding, 24px gap)
- 40px button heights
- Design system variables (var(--space-5), var(--color-primary-default))
- Proper hover states with light teal background
- Save/Share/Edit utility buttons (circular, 40px)
- Refer & Earn CTA with Gift icon (20px)

### 🔧 Components Requiring Updates

1. **AboutCard** - Organisation description and bio
2. **VerificationCard** - Credentials & Trust sidebar
3. **OrganisationStatsCard** - Statistics sidebar
4. **TeamMembersCard** - Team member showcase
5. **ReviewsCard** - Aggregate reviews
6. **SimilarOrganisationsCard** - Related organisations
7. **MobileBottomCTA** - Fixed mobile footer

---

## Design System Standards (Reference)

### Color Palette
```css
/* Primary Colors */
--color-primary-default: #006c67;      /* Teal */
--color-primary-hover: #005550;        /* Dark teal */
--color-primary-light: #E6F0F0;        /* Light teal */

/* Neutral Colors */
--color-text-primary: #1e293b;         /* Dark slate */
--color-text-secondary: #475569;       /* Medium slate */
--color-text-tertiary: #64748b;        /* Light slate */
--color-border-default: #d1d5db;       /* Grey border */
--color-background-card: #ffffff;      /* White */
--color-background-subtle: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
```

### Spacing System (8-point grid)
```css
--space-1: 8px;
--space-2: 16px;
--space-3: 24px;
--space-4: 32px;
--space-5: 40px;
--space-6: 48px;
```

### Button Standards
```css
/* Primary Button */
min-height: 40px;
padding: 10px 24px;
background: var(--color-primary-default);
border-radius: var(--radius-md, 8px);
font-size: 0.875rem (14px);
font-weight: 700;

/* Secondary Button */
background: white;
border: 1px solid #d1d5db;
color: #1e293b;
font-weight: 600;

/* Hover State */
background: var(--color-primary-light, #E6F0F0);
border-color: var(--color-primary-default);
color: var(--color-primary-default);
```

### Typography
```css
/* Headings */
h1: 2rem (32px), font-weight: 700, color: #1e293b
h2: 1.5rem (24px), font-weight: 700, color: #1e293b
h3: 1.25rem (20px), font-weight: 600, color: #1e293b

/* Body Text */
font-size: 1rem (16px)
line-height: 1.5
color: #475569
```

---

## Component-by-Component Redesign Plan

### 1. AboutCard (Main Content Area)

**Current Issues:**
- Custom purple accent colors
- Inconsistent typography
- Non-standard button styling
- Missing design system variables

**Proposed Changes:**

#### Layout
```css
.card {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 40px);  /* Match hero padding */
  margin-bottom: var(--space-4, 32px);
  border: 1px solid #e5e7eb;  /* Subtle border */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4, 32px);
}

.title {
  font-size: 1.5rem;  /* 24px */
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
```

#### Video Button (Right of header)
```css
.videoButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md, 8px);
  color: #1e293b;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.videoButton:hover {
  background: var(--color-primary-light, #E6F0F0);
  border-color: var(--color-primary-default, #006c67);
  color: var(--color-primary-default);
}
```

#### Tagline
```css
.tagline {
  font-size: 1.125rem;  /* 18px */
  font-style: italic;
  color: #475569;
  background: #f9fafb;  /* Light grey background */
  padding: var(--space-3, 24px);
  border-left: 4px solid var(--color-primary-default, #006c67);
  border-radius: var(--radius-md, 8px);
  margin-bottom: var(--space-4, 32px);
}
```

#### Bio Text
```css
.bioText {
  font-size: 1rem;
  line-height: 1.6;
  color: #475569;
  margin-bottom: var(--space-3, 24px);
}
```

#### Read More Button
```css
.expandButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-primary-default, #006c67);
  font-size: 0.875rem;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.expandButton:hover {
  color: var(--color-primary-hover, #005550);
  text-decoration: underline;
}
```

#### Website Link
```css
.websiteSection {
  margin-top: var(--space-4, 32px);
  padding-top: var(--space-4, 32px);
  border-top: 1px solid #e5e7eb;
}

.websiteLabel {
  font-weight: 600;
  color: #1e293b;
  margin-right: 8px;
}

.websiteLink {
  color: var(--color-primary-default, #006c67);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.websiteLink:hover {
  color: var(--color-primary-hover, #005550);
  text-decoration: underline;
}
```

---

### 2. VerificationCard (Sidebar)

**Current Issues:**
- Inconsistent icon colors (should be teal)
- Non-standard card styling
- Purple progress bar (should be teal)

**Proposed Changes:**

#### Card Container
```css
.card {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 32px);
  border: 1px solid #e5e7eb;
  margin-bottom: var(--space-3, 24px);
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--space-4, 32px);
}

.headerIcon {
  color: var(--color-primary-default, #006c67);  /* Teal shield icon */
}

.title {
  font-size: 1.125rem;  /* 18px */
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
```

#### Verification Items
```css
.verificationItem {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: var(--space-3, 24px);
  background: #f9fafb;  /* Light grey background */
  border-radius: var(--radius-md, 8px);
  margin-bottom: var(--space-2, 16px);
}

.iconWrapper {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-light, #E6F0F0);  /* Light teal background */
  display: flex;
  align-items: center;
  justify-content: center;
}

.verifiedIcon {
  color: var(--color-primary-default, #006c67);  /* Teal icon */
}

.verificationLabel {
  font-size: 0.9375rem;  /* 15px */
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.verificationDescription {
  font-size: 0.875rem;  /* 14px */
  color: #64748b;
  line-height: 1.4;
}
```

#### DBS Progress Bar
```css
.progressBar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 12px;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-default) 0%, var(--color-primary-hover) 100%);
  transition: width 0.3s ease;
}
```

#### Highly Trusted Badge (Full width, prominent)
```css
.highlyTrustedBadge {
  background: linear-gradient(135deg, var(--color-primary-default) 0%, var(--color-primary-hover) 100%);
  color: white;
  padding: var(--space-3, 24px);
  border-radius: var(--radius-md, 8px);
  text-align: center;
  margin-top: var(--space-3, 24px);
  box-shadow: 0 4px 12px rgba(0, 108, 103, 0.2);
}

.highlyTrustedIcon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
}

.highlyTrustedTitle {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.highlyTrustedSubtitle {
  font-size: 0.875rem;
  opacity: 0.9;
}
```

#### Footer Note
```css
.verificationFooter {
  margin-top: var(--space-4, 32px);
  padding-top: var(--space-3, 24px);
  border-top: 1px solid #e5e7eb;
  font-size: 0.8125rem;  /* 13px */
  color: #64748b;
  text-align: center;
  font-style: italic;
}
```

---

### 3. OrganisationStatsCard (Sidebar)

**Current Issues:**
- Emoji star instead of icon
- Inconsistent stat item styling
- Non-standard colors

**Proposed Changes:**

#### Card & Header
```css
.card {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 32px);
  border: 1px solid #e5e7eb;
  margin-bottom: var(--space-3, 24px);
}

.title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 var(--space-4, 32px) 0;
}
```

#### Stats Grid
```css
.statsGrid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 24px);
}

.statItem {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--space-3, 24px);
  background: #f9fafb;
  border-radius: var(--radius-md, 8px);
  transition: all 0.2s;
}

.statItem:hover {
  background: var(--color-primary-light, #E6F0F0);
  border-left: 4px solid var(--color-primary-default, #006c67);
  padding-left: 20px;  /* Compensate for border */
}

.statIcon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-default, #006c67);
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.statContent {
  flex: 1;
}

.statValue {
  font-size: 1.5rem;  /* 24px */
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  margin-bottom: 4px;
}

.statLabel {
  font-size: 0.875rem;  /* 14px */
  color: #64748b;
  font-weight: 500;
}
```

#### Special: Average Rating
```css
/* Remove emoji, use filled star icon */
.statValue .ratingIcon {
  color: #fbbf24;  /* Gold star */
  margin-right: 4px;
}
```

---

### 4. TeamMembersCard (Main Content)

**Current Issues:**
- Inconsistent member card styling
- Purple hover states
- Non-standard spacing

**Proposed Changes:**

#### Card Container
```css
.card {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 40px);
  margin-bottom: var(--space-4, 32px);
  border: 1px solid #e5e7eb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4, 32px);
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.viewAllButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-primary-default, #006c67);
  font-size: 0.875rem;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.viewAllButton:hover {
  color: var(--color-primary-hover, #005550);
}
```

#### Members Grid
```css
.membersGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3, 24px);
}

.memberCard {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-md, 8px);
  padding: var(--space-3, 24px);
  display: flex;
  align-items: start;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.memberCard:hover {
  background: var(--color-primary-light, #E6F0F0);
  border-color: var(--color-primary-default, #006c67);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 108, 103, 0.15);
}

.memberAvatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.memberInfo {
  flex: 1;
  min-width: 0;  /* Allow text truncation */
}

.memberName {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.memberBio {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.memberBadges {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary-default, #006c67);
}

.badge svg {
  width: 12px;
  height: 12px;
}
```

---

### 5. ReviewsCard (Main Content)

**Current Issues:**
- Inconsistent review item styling
- Purple star colors
- Non-standard spacing

**Proposed Changes:**

#### Card Container
```css
.card {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 40px);
  margin-bottom: var(--space-4, 32px);
  border: 1px solid #e5e7eb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4, 32px);
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
```

#### Review Items
```css
.reviewsList {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 32px);
}

.reviewItem {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: var(--space-4, 32px);
}

.reviewItem:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.reviewHeader {
  display: flex;
  align-items: start;
  gap: 16px;
  margin-bottom: var(--space-3, 24px);
}

.reviewerAvatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
}

.reviewerInfo {
  flex: 1;
}

.reviewerName {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.reviewDate {
  font-size: 0.875rem;
  color: #64748b;
}

.ratingStars {
  display: flex;
  gap: 4px;
  margin-bottom: var(--space-2, 16px);
}

.star {
  color: #fbbf24;  /* Gold */
  width: 16px;
  height: 16px;
}

.reviewText {
  font-size: 1rem;
  line-height: 1.6;
  color: #475569;
}

.revieweeTag {
  display: inline-block;
  margin-top: 12px;
  padding: 4px 12px;
  background: var(--color-primary-light, #E6F0F0);
  color: var(--color-primary-default, #006c67);
  border-radius: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
}
```

#### Empty State
```css
.emptyState {
  text-align: center;
  padding: var(--space-6, 48px) var(--space-4, 32px);
  background: #f9fafb;
  border-radius: var(--radius-md, 8px);
  color: #64748b;
  font-size: 1rem;
}
```

---

### 6. SimilarOrganisationsCard (Sidebar)

**Current Issues:**
- Inconsistent card hover states
- Purple accents
- Non-standard spacing

**Proposed Changes:**

#### Card Container
```css
.card {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-4, 32px);
  border: 1px solid #e5e7eb;
  margin-bottom: var(--space-3, 24px);
}

.title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 var(--space-4, 32px) 0;
}
```

#### Organisation Items
```css
.orgList {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 24px);
}

.orgItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--space-2, 16px);
  background: #f9fafb;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.orgItem:hover {
  background: var(--color-primary-light, #E6F0F0);
  border-color: var(--color-primary-default, #006c67);
  transform: translateX(4px);
}

.orgLogo {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md, 8px);
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.orgInfo {
  flex: 1;
  min-width: 0;
}

.orgName {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.orgMeta {
  font-size: 0.8125rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratingBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #fbbf24;
  font-weight: 600;
}
```

---

### 7. MobileBottomCTA (Fixed Footer)

**Current Issues:**
- Purple gradient background (should be teal)
- Different positioning from public-profile version
- Non-standard button styling

**Design Goal:**
Match the public-profile MobileBottomCTA exactly (already design-system compliant)

**Reference Implementation:**
`apps/web/src/app/components/feature/public-profile/MobileBottomCTA.module.css`

**Proposed Changes:**

#### Container (Match public-profile)
```css
.container {
  position: fixed;
  bottom: 56px; /* Position above bottom nav bar */
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
  z-index: 101; /* Higher than bottom nav (100) */
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
  display: block;
}

/* Show on mobile and tablet, hide on desktop */
@media (min-width: 1024px) {
  .container {
    display: none;
  }
}

/* Tablet styling */
@media (min-width: 640px) and (max-width: 1023px) {
  .container {
    padding: 12px 24px;
  }
}
```

#### Content Container
```css
.content {
  display: flex;
  gap: 12px;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Tablet: Constrain width */
@media (min-width: 640px) and (max-width: 1023px) {
  .content {
    max-width: 600px;
    gap: 16px;
  }
}
```

#### CTA Buttons (40px height, matching profile)
```css
.ctaButton {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  min-height: 40px !important;
  font-size: 1rem;
  padding: 10px 24px !important; /* 10px top/bottom for 40px total */
  border-radius: 8px;
  box-shadow: none !important;
  outline: none !important;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.ctaButton:focus,
.ctaButton:active {
  box-shadow: none !important;
  outline: none !important;
}

/* Tablet: Keep standard height */
@media (min-width: 640px) and (max-width: 1023px) {
  .ctaButton {
    min-height: 40px !important;
    font-size: 1rem;
    padding: 10px 32px !important;
  }
}
```

#### Primary Button (Book Session - Teal)
```css
.primaryButton {
  background-color: var(--color-primary-default, #006c67) !important;
  color: white !important;
  border: 1px solid var(--color-primary-default, #006c67) !important;
}

.primaryButton:active {
  background-color: var(--color-primary-hover, #005550) !important;
  transform: scale(0.98);
}
```

#### Secondary Button (Join Team - Outline Teal)
```css
.secondaryButton {
  background-color: transparent !important;
  color: var(--color-primary-default, #006c67) !important;
  border: 1px solid var(--color-primary-default, #006c67) !important;
}

.secondaryButton:active {
  background-color: var(--color-primary-light, #E6F0F0) !important;
  transform: scale(0.98);
}
```

#### Responsive - Extra Small Mobile
```css
@media (max-width: 480px) {
  .container {
    padding: 10px 12px;
    bottom: 54px;
  }

  .content {
    gap: 8px;
  }

  .ctaButton {
    font-size: 0.9375rem;
    padding: 10px 16px !important;
    min-height: 40px !important;
  }
}
```

**Key Differences from Public Profile:**
- Buttons: "Book Session" + "Join Team" (instead of "Message" + "Book Session")
- Icons: `Calendar` + `Briefcase` (instead of `MessageCircle` + `Calendar`)
- Same styling, positioning, and behavior otherwise

---

## Global Design Tokens to Add

Create a new file: `apps/web/src/styles/design-tokens.css`

```css
:root {
  /* ============================================
     COLOR PALETTE
     ============================================ */

  /* Primary - Teal */
  --color-primary-default: #006c67;
  --color-primary-hover: #005550;
  --color-primary-light: #E6F0F0;
  --color-primary-dark: #004440;

  /* Secondary - Supporting Teal */
  --color-secondary-default: #4CAEAD;
  --color-secondary-hover: #3a9d9c;
  --color-secondary-light: #E8F5F5;

  /* Success */
  --color-success-default: #10b981;
  --color-success-light: #d1fae5;

  /* Warning */
  --color-warning-default: #FF9800;
  --color-warning-light: #fff4e5;

  /* Error */
  --color-error-default: #ef4444;
  --color-error-light: #fee2e2;

  /* Neutral - Text */
  --color-text-primary: #1e293b;      /* Dark slate */
  --color-text-secondary: #475569;    /* Medium slate */
  --color-text-tertiary: #64748b;     /* Light slate */
  --color-text-disabled: #9ca3af;     /* Grey */

  /* Neutral - Backgrounds */
  --color-background-card: #ffffff;
  --color-background-subtle: #f9fafb;
  --color-background-grey: #f3f4f6;
  --color-background-gradient: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);

  /* Neutral - Borders */
  --color-border-default: #d1d5db;
  --color-border-light: #e5e7eb;
  --color-border-subtle: #f3f4f6;

  /* Special - Star Rating */
  --color-star-gold: #fbbf24;

  /* ============================================
     SPACING (8-point grid)
     ============================================ */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-7: 56px;
  --space-8: 64px;

  /* ============================================
     TYPOGRAPHY
     ============================================ */
  --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Font Sizes */
  --font-size-xs: 0.75rem;       /* 12px */
  --font-size-sm: 0.875rem;      /* 14px */
  --font-size-base: 1rem;        /* 16px */
  --font-size-lg: 1.125rem;      /* 18px */
  --font-size-xl: 1.25rem;       /* 20px */
  --font-size-2xl: 1.5rem;       /* 24px */
  --font-size-3xl: 2rem;         /* 32px */

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;

  /* ============================================
     BORDER RADIUS
     ============================================ */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ============================================
     SHADOWS
     ============================================ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.15);

  /* Teal shadows */
  --shadow-primary-sm: 0 2px 6px rgba(0, 108, 103, 0.2);
  --shadow-primary-md: 0 4px 8px rgba(0, 108, 103, 0.3);
  --shadow-primary-lg: 0 6px 16px rgba(0, 108, 103, 0.4);

  /* ============================================
     BUTTON STYLES
     ============================================ */
  --button-height-standard: 40px;
  --button-height-compact: 32px;
  --button-height-large: 48px;

  --button-padding-v-standard: 10px;
  --button-padding-h-standard: 24px;

  /* ============================================
     TRANSITIONS
     ============================================ */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;

  /* ============================================
     Z-INDEX LAYERS
     ============================================ */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `design-tokens.css` with all global variables
- [ ] Import design tokens in main stylesheet
- [ ] Update AboutCard styling
- [ ] Update VerificationCard styling

### Phase 2: Content Cards (Week 2)
- [ ] Update OrganisationStatsCard styling
- [ ] Update TeamMembersCard styling
- [ ] Update ReviewsCard styling

### Phase 3: Supporting Components (Week 3)
- [ ] Update SimilarOrganisationsCard styling
- [ ] Update MobileBottomCTA styling
- [ ] Test responsive breakpoints across all components

### Phase 4: Polish & QA (Week 4)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile device testing (iOS Safari, Chrome Android)
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Performance optimization (unused CSS removal)
- [ ] Final design review with team

---

## Quality Assurance Checklist

### Visual Consistency
- [ ] All teal colors use design system variables
- [ ] No purple/custom colors remain
- [ ] All cards have consistent padding (40px main, 32px sidebar)
- [ ] All borders use #e5e7eb or #d1d5db
- [ ] All buttons are exactly 40px height (48px on mobile)
- [ ] All hover states use light teal background (#E6F0F0)

### Typography
- [ ] All headings use correct font sizes and weights
- [ ] All body text is 16px with 1.5-1.6 line height
- [ ] All colors from design system (no hardcoded greys)

### Spacing
- [ ] All components use 8-point grid spacing
- [ ] Consistent gap between cards (24px-32px)
- [ ] Proper responsive padding at breakpoints

### Interactivity
- [ ] All clickable elements have hover states
- [ ] All transitions are 0.2s ease
- [ ] All buttons have proper focus states for accessibility
- [ ] No layout shift on hover (transform: translateY only)

### Accessibility
- [ ] All interactive elements have proper ARIA labels
- [ ] Color contrast ratios meet WCAG AA standards
- [ ] Keyboard navigation works for all components
- [ ] Screen reader friendly semantic HTML

---

## Migration Strategy

### Approach: Incremental Component Updates
1. **One component at a time** - Update, test, deploy
2. **Feature flags** - Optional: Use feature flag to toggle new styles
3. **A/B testing** - Compare conversion rates before/after redesign
4. **Rollback plan** - Keep old CSS files for 2 weeks post-deployment

### Risk Mitigation
- **Visual regression testing** with Percy or Chromatic
- **Staging environment** review before production
- **Gradual rollout** to 10% → 50% → 100% of users
- **Monitor analytics** for drop in engagement metrics

---

## Success Metrics

### Quantitative
- **Conversion Rate:** Increase in "Book a Session" clicks
- **Engagement:** Time on page increases by 15%+
- **Bounce Rate:** Decreases by 10%+
- **Mobile Usage:** No increase in mobile bounce rate

### Qualitative
- **Design Consistency:** All components match hero section quality
- **Brand Alignment:** Consistent teal color usage throughout
- **User Feedback:** Positive sentiment in user testing sessions
- **Developer Experience:** Easier to maintain with design tokens

---

## Maintenance & Documentation

### Living Style Guide
Create a style guide page at `/styleguide` showing:
- All color variables with usage examples
- All button variants
- All card layouts
- Typography hierarchy
- Spacing examples

### Component Documentation
Each component should document:
- Props interface
- CSS variables it uses
- Responsive behavior
- Accessibility considerations

---

## Appendix: Before/After Comparison

### Current Issues Summary
1. ❌ Mixed purple and teal colors
2. ❌ Inconsistent spacing (custom values vs design system)
3. ❌ Non-standard button heights
4. ❌ Emoji stars instead of icon components
5. ❌ Hardcoded colors instead of variables
6. ❌ Inconsistent hover states
7. ❌ Non-standard card padding

### After Implementation
1. ✅ Unified teal color palette from design tokens
2. ✅ 8-point grid spacing throughout
3. ✅ All buttons exactly 40px (48px mobile)
4. ✅ Lucide icon components for stars and badges
5. ✅ CSS variables for all colors
6. ✅ Consistent light teal hover states
7. ✅ 40px main content, 32px sidebar padding

---

## Next Steps

**Immediate Actions:**
1. Review and approve this design plan
2. Create design-tokens.css file
3. Begin Phase 1 implementation with AboutCard
4. Schedule design review checkpoint after Phase 1

**Questions for Stakeholders:**
1. Timeline preference: Phased rollout or big-bang deployment?
2. Should we include visual regression testing?
3. Budget for A/B testing tools (if needed)?
4. Priority components if timeline is compressed?

---

**Document Version:** 1.0
**Created:** 2026-01-04
**Last Updated:** 2026-01-04
**Author:** Claude Sonnet 4.5
**Status:** Awaiting Approval
