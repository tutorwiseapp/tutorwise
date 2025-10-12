# Tutorwise Marketplace - Visual Layout & Design Specification

## Page Structure Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         HERO SECTION                                │
│                     (Gradient Background)                           │
│                                                                     │
│                 Find Your Perfect Tutor or                          │
│                    Learning Experience                              │
│                                                                     │
│            Use AI to plan, book, or refer your next lesson          │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │  🔍  Ask me anything — e.g., 'Find a GCSE maths...      ➜ │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                     │
│   Try: [GCSE maths in London] [Chemistry A-Level] [Piano lessons]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        FILTER CHIPS BAR                             │
│   (Sticky on scroll, white background)                              │
│                                                                     │
│   [Subject ▾]  [Level ▾]  [Location ▾]  [Free Trial]  [Clear all]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        MARKETPLACE GRID                             │
│                     (Responsive Layout)                             │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │          │  │          │  │          │  │          │         │
│   │  Image   │  │  Image   │  │  Image   │  │  Image   │         │
│   │  3:2     │  │  3:2     │  │  3:2     │  │  3:2     │         │
│   │          │  │          │  │          │  │          │         │
│   ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤         │
│   │ London • │  │ Online • │  │ Bristol •│  │ Online • │         │
│   │ In Person│  │ Online   │  │ Hybrid   │  │ Online   │         │
│   │          │  │          │  │          │  │          │         │
│   │ GCSE Math│  │ Chemistry│  │ Spanish  │  │ Piano    │         │
│   │ Tutor    │  │ A-Level  │  │ Lessons  │  │ Teacher  │         │
│   │          │  │          │  │          │  │          │         │
│   │ [Math]   │  │ [Chem]   │  │ [Lang]   │  │ [Music]  │         │
│   │ [Physics]│  │ [Science]│  │ [French] │  │ [Theory] │         │
│   │          │  │          │  │          │  │          │         │
│   │ ⭐ 4.8(24)│  │ ⭐ 4.9(31)│  │ ⭐ 4.7(18)│  │ ⭐ 5.0(12)│         │
│   │          │  │          │  │          │  │          │         │
│   │ £25/hr   │  │ £30/hr   │  │ £22/hr   │  │ £35/hr   │         │
│   │          │  │          │  │          │  │          │         │
│   │[Details] │  │[Details] │  │[Details] │  │[Details] │         │
│   │[Book Now]│  │[Book Now]│  │[Book Now]│  │[Book Now]│         │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                     │
│   (More cards...)                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Responsive Breakpoints

### Desktop (1280px+)
```
Hero: Full width, centered content (max-width: 900px)
Grid: 4 columns
Filter Bar: Horizontal chips
Card Size: ~320px width
```

### Tablet (1024px)
```
Hero: Full width, centered content (max-width: 900px)
Grid: 3 columns
Filter Bar: Horizontal chips
Card Size: ~300px width
```

### Mobile Tablet (768px)
```
Hero: Full width, centered content (max-width: 100%)
Grid: 2 columns
Filter Bar: Horizontal chips (scrollable)
Card Size: ~280px width
```

### Mobile (< 640px)
```
Hero: Full width, stacked layout
Grid: 1 column
Filter Bar: Horizontal chips (scrollable)
Card Size: Full width - 40px padding
Search Bar: Simplified, smaller buttons
```

## Color Palette

### Primary Colors
```
Teal-700:  #0f766e (Primary buttons, hero gradient start)
Teal-500:  #14b8a6 (Hero gradient end)
```

### Neutral Colors
```
Gray-50:   #f9fafb (Page background)
Gray-100:  #f3f4f6 (Card backgrounds, hover states)
Gray-200:  #e5e7eb (Borders)
Gray-300:  #d1d5db (Dividers)
Gray-400:  #9ca3af (Placeholders)
Gray-600:  #6b7280 (Secondary text)
Gray-900:  #111827 (Primary text)
White:     #ffffff (Cards, inputs)
```

### Accent Colors
```
Green-50:  #d1fae5 (Success badge background)
Green-700: #065f46 (Success badge text)
Yellow-400: #fbbf24 (Star ratings)
Red-600:   #dc2626 (Delete/danger actions)
```

## Typography Scale

### Headings
```
Hero Title:       48px (3rem)     / weight: 700 / line-height: 1.1
Hero Subtitle:    20px (1.25rem)  / weight: 400 / line-height: 1.5
Section Title:    24px (1.5rem)   / weight: 600 / line-height: 1.3
Card Title:       18px (1.125rem) / weight: 600 / line-height: 1.4
```

### Body Text
```
Large:    16px (1rem)      / weight: 400 / line-height: 1.6
Regular:  15px (0.9375rem) / weight: 400 / line-height: 1.6
Small:    14px (0.875rem)  / weight: 500 / line-height: 1.5
Tiny:     12px (0.75rem)   / weight: 500 / line-height: 1.4
```

### Mobile Typography
```
Hero Title:       32px (2rem)     / weight: 700
Hero Subtitle:    16px (1rem)     / weight: 400
Card Title:       16px (1rem)     / weight: 600
```

## Spacing System (8px Grid)

### Padding
```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  16px  (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
3xl: 64px  (4rem)
```

### Gaps
```
Card Grid:    32px (desktop), 24px (mobile)
Flex Items:   12px, 16px, 24px
Chip Spacing: 12px
```

## Component Dimensions

### Hero Section
```
Desktop:  padding: 80px 24px 120px
Mobile:   padding: 60px 20px 80px
Search Bar Height: 64px (desktop), 56px (mobile)
```

### Tutor Cards
```
Image Aspect Ratio: 3:2
Card Border Radius: 16px
Image Border Radius: 16px (top)
Card Shadow: 0 1px 3px rgba(0,0,0,0.1)
Card Shadow Hover: 0 8px 24px rgba(0,0,0,0.12)
```

### Filter Bar
```
Height: 72px
Button Border Radius: 24px
Button Padding: 8px 16px
Sticky Top: 0
```

## Animations & Transitions

### Hover Effects
```css
Card Hover:
  transform: translateY(-4px)
  shadow: 0 8px 24px rgba(0,0,0,0.12)
  duration: 0.3s ease

Button Hover:
  transform: translateY(-1px)
  duration: 0.2s ease

Image Zoom:
  transform: scale(1.05)
  duration: 0.3s ease
```

### Loading States
```css
Spinner:
  animation: spin 0.8s linear infinite

Skeleton:
  animation: pulse 1.5s ease-in-out infinite
```

### Dropdown
```css
slideDown:
  from { opacity: 0; transform: translateY(-8px) }
  to   { opacity: 1; transform: translateY(0) }
  duration: 0.2s ease
```

## Interaction States

### Buttons
```
Default:  bg: #0f766e, text: white
Hover:    bg: #115e59, shadow: 0 4px 12px rgba(15,118,110,0.3)
Active:   bg: #115e59, transform: scale(0.98)
Disabled: bg: #0f766e, opacity: 0.5, cursor: not-allowed
```

### Cards
```
Default:  shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover:    shadow: 0 8px 24px rgba(0,0,0,0.12), translateY(-4px)
Focus:    outline: 2px solid #14b8a6, outline-offset: 2px
```

### Filters
```
Default:     bg: white, border: #d1d5db
Hover:       bg: #f9fafb, border: #9ca3af
Active:      bg: #0f766e, text: white
Active Hover: bg: #115e59
```

## Icons & Graphics

### Icon Size
```
Small:  16px (search, arrows)
Medium: 20px (buttons)
Large:  48px (placeholders)
Huge:   64px (empty states)
```

### Icon Style
```
Type: Outline SVG
Stroke Width: 1.67 (icons), 2 (empty states)
Color: Inherit from parent
```

## Loading & Empty States

### Loading Skeleton
```
Background: #f3f4f6
Animation: Pulse
Height: Matches content
Border Radius: 8px
```

### Empty State
```
Icon: 64x64px, gray-300
Title: 24px, gray-900, weight: 600
Text: 16px, gray-600
Button: Primary style
Padding: 80px 24px
```

## Accessibility Features

### Focus States
```
Outline: 2px solid #14b8a6
Outline Offset: 2px
Border Radius: Matches element
```

### Color Contrast
```
Body Text on White: 13.38:1 (AAA)
Secondary Text on White: 4.54:1 (AA)
White Text on Teal-700: 5.17:1 (AA)
```

### Screen Reader
```
Skip Links: Hidden but focusable
ARIA Labels: On all interactive elements
Semantic HTML: Proper heading hierarchy
Alt Text: On all images
```

## Mobile-Specific Considerations

### Touch Targets
```
Minimum Size: 44x44px
Button Padding: 12px 24px
Icon Button Size: 48x48px
```

### Gestures
```
Swipe: Not implemented (future enhancement)
Pull to Refresh: Not implemented
Pinch to Zoom: Allowed on images
```

### Mobile Navigation
```
Header: Sticky, 64px height
Hero: Responsive padding
Filters: Horizontal scroll, snap to start
Cards: Full width minus padding
```

## Performance Metrics

### Target Metrics
```
Lighthouse Performance: > 90
First Contentful Paint: < 1.5s
Largest Contentful Paint: < 2.5s
Time to Interactive: < 3.5s
Cumulative Layout Shift: < 0.1
```

### Bundle Sizes
```
Marketplace Page JS: 5.2 kB
First Load JS: 101 kB
CSS Modules: ~8 kB (estimated)
Images: Lazy loaded
```

## Design Tokens (CSS Variables - Future)

```css
:root {
  /* Colors */
  --color-primary: #0f766e;
  --color-primary-hover: #115e59;
  --color-background: #f9fafb;
  --color-text: #111827;
  --color-text-secondary: #6b7280;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
}
```

## Component Composition

### Hero Section
```
HeroSection
├── heroSection (container)
│   └── heroContent
│       ├── heroTitle
│       ├── heroSubtitle
│       ├── searchForm
│       │   └── searchBarContainer
│       │       ├── searchIcon
│       │       ├── searchInput
│       │       └── searchButton
│       └── examplesContainer
│           ├── examplesLabel
│           └── exampleChips
│               └── exampleChip (multiple)
```

### Tutor Card
```
TutorCard
├── tutorCard (container)
│   ├── cardLink
│   │   ├── imageContainer
│   │   │   ├── image
│   │   │   └── trialBadge (conditional)
│   │   └── content
│   │       ├── metaRow
│   │       │   ├── location
│   │       │   ├── divider
│   │       │   └── locationType
│   │       ├── title
│   │       ├── subjects
│   │       │   └── subjectTag (multiple)
│   │       ├── rating
│   │       │   ├── starIcon
│   │       │   ├── ratingValue
│   │       │   └── reviewCount
│   │       └── priceRow
│   │           └── price
│   └── actions
│       ├── actionButton (View Details)
│       └── primaryButton (Book Now)
```

### Filter Chips
```
FilterChips
└── filterChips (container)
    └── filterRow
        ├── filterGroup (multiple)
        │   ├── filterButton
        │   └── dropdown (conditional)
        │       └── dropdownContent
        │           └── checkboxLabel (multiple)
        └── clearButton (conditional)
```

## Future Enhancements - UI/UX

1. **Map View Toggle**: Switch between grid and map view
2. **Quick View Modal**: Preview tutor without leaving page
3. **Comparison Mode**: Select multiple tutors to compare
4. **Save to Favorites**: Heart icon on cards
5. **Share Feature**: Share tutor profiles
6. **Advanced Filters**: Slider for price, calendar for availability
7. **Sort Dropdown**: Sort by relevance, price, rating
8. **Infinite Scroll**: Replace pagination
9. **Image Gallery**: Swipeable image carousel on cards
10. **Video Auto-play**: Hover to play tutor intro videos

---

**Design System Status**: ✅ Complete
**Responsive Design**: ✅ Mobile, Tablet, Desktop
**Accessibility**: ✅ WCAG AA Compliant
**Performance**: ✅ Optimized
**Browser Support**: ✅ Modern Browsers
