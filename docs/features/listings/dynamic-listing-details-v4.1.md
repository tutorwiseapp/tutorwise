# dynamic-listing-details-v4.1

### **dynamic-listing-details-v4.1**

**Version: 4.1 (As-Built)**

**Date: November 5, 2025**

**Status: For Implementation**

**Owner: Senior Architect**

### 1.0 Executive Summary

This document outlines the complete redesign of the public-facing "Listing Details" page, which is the primary conversion point for clients. It is architecturally designed to replace the legacy `apps/web/src/app/tutor/[id]/[slug]/page.tsx`/\[slug\]/page.tsx\`\].

The current implementation is a static, single-product template that is now incompatible with our new multi-service architecture (defined in SDD v4.0). This redesign transforms it into a **dynamic, context-aware, and high-converting product page** capable of intelligently displaying all four service types: "One-to-One," "Group Session," "Workshop," and "Study Package."

The new design, inspired by top-tier marketplaces (like `image_c86e62.jpg`), will feature a **"mixed-column" layout** to create an aesthetic, immersive, and clear user journey:

1. **Top (1-Column):** A wide, immersive header and image grid.
2. **Body (2-Column):** A main content column (Col 1) and a **sticky, dynamic "Action Card"** (Col 2) that follows the user as they scroll.
3. **Bottom (1-Column):** Full-width sections for Reviews and a "Matching Engine" (Related Listings).

### 2.0 Naming & Route Architecture

1. **Page Name:** "Listing Details" (or simply "Listing").
2. **Route Deprecation:** The route `apps/web/src/app/tutor/[id]/[slug]/`/\[slug\]/page.tsx\`\] is architecturally incorrect, as it misrepresents the *tutor* as the product, not the *service*.
3. **New Route:** A new, clean route will be created at `apps/web/src/app/listings/[id]/page.tsx`.
4. **SEO & Redirects:** A 301 (permanent) redirect will be configured in `middleware.ts` to pass SEO value from the old `/tutor/...` URLs to the new `/listings/[id]` URLs.

### 3.0 Dynamic "Context-Aware" Architecture

This is the core of the new design. The page **must** be dynamic.

- The `listings/[id]/page.tsx` will be a **Server Component**. It will fetch all listing data, including the `listing_type` and the `details: jsonb` field (which contains Workshop/Package data from `CreateListings.tsx`).
- This data will be passed as props to new **Client Components** for interactivity.
- The `<ActionCard>` component (in Column 2) will be the "smart" component. It will contain a `switch (listing.listing_type)` to render a *completely different set of booking tools* for each service type, ensuring we never show a weekly calendar for a "Study Package."

### 4.0 Design System & AI Coding Context

This design adheres strictly to the `DESIGN-SYSTEM.md` and our "as-built" v3.7+ architecture.

- **Components:** All new components must be built using the standard UI components: `<Card>`, `<Button>`, `<StatusBadge>`, etc.
- **Colors & Tokens:** All styles must use the CSS variables defined in `globals.css` (e.g., `var(--color-primary-default)`).
- **Layout:** The page is a standard layout (Header/Container/Footer), **not** the 3-column hub layout. It uses `<Container size="default">` to constrain the content to `1200px`.
- **Data:** The page must read and display all new data fields from SDD v4.0, including `AvailabilityFormSection.tsx` data and `UnavailabilityFormSection.tsx` data.

### 5.0 UI Layout Design (ASCII Diagram) - v4.1

This diagram shows the new, dynamic "Listing Details" page, using the **"One-to-One Session"** test case. It now includes all missing components you identified.

```
Code snippet
```

```
+--------------------------------------------------------------------------------------------------+
|                                    Tutorwise Application Window                                    |
| +------------------------------------------------------------------------------------------------+ |
| | <Header (Standard Site Header)> [ Uses NavMenu.tsx ]                                           | |
| +------------------------------------------------------------------------------------------------+ |
| |                                                                                                | |
| | <Container size="default">  [ Max-width: 1200px, Centered ]                                    | |
| |                                                                                                | |
| |   (SECTION 1: 1-COLUMN HEADER & IMAGES)                                                        | |
| |                                                                                                | |
| |   <ListingHeader title="A-Level Maths Revision (One-to-One)" />                                | |
| |   <MetadataBar [4.9 (100 Reviews)] [London, UK] [Save ♡] [Share] />                          | |
| |                                                                                                | |
| |   <ListingImageGrid                                                                          | |
| |     +----------------------------------+ +-----------------+ +-----------------+              | |
| |     |                                  | |                 | |                 |              | |
| |     |   (Main Image 1: 16:9)           | |   (Image 2)     | |   (Image 3)     |              | |
| |     |   [Hero Image from Upload]       | |   [Gallery Img] | |   [Gallery Img] |              | |
| |     |                                  | |                 | |                 |              | |
| |     +----------------------------------+ +-----------------+ +-----------------+              | |
| |   />                                                                                         | |
| |                                                                                                | |
| |   (SECTION 2: 2-COLUMN BODY)                                                                   | |
| |   +------------------------------------------------------+-----------------------------------+ | |
| |   |   (Column 1: Main Content)                           |   (Column 2: Sticky Action Card)  | | |
| |   |   [ CSS: grid-cols-1 md:grid-cols-3 gap-6 ]          |   [ CSS: position: sticky; top: 24px ]| |
| |   |   [ (Col 1 takes 2 grid spans) ]                     |   [ (Col 2 takes 1 grid span) ]     | | |
| |   |                                                      |                                   | | |
| |   | <ListingDetails>                                     |   <ActionCard>                    | | |
| |   |   <Card (Tutor Info)>                                |     <Card>                        | | |
| |   |     <h4>A-Level Maths session with [Tutor Name]</h4>  |       { VARIANT: "One-to-One" }     | | |
| |   |     [ Avatar ] [ Tutor Name ] [ View Profile -> ]      |       <PriceOptions>              | | |
| |   |   </Card>                                            |         [ One-to-One: £45.00/hr ] | | |
| |   |                                                      |         [ Group (5): £20.00/hr  ] | | |
| |   |   <Card (Tutor Verification)>  <-- ADDED               |       </PriceOptions>             | | |
| |   |     <h4>Tutor Verification</h4> [from image_fd0e3f.png]|       <hr>                        | | |
| |   |     [✓] Email [✓] Phone [✓] ID [ ] DBS Check         |       <h4>Select a date & time</h4>  | | |
| |   |   </Card>                                            |       [ <AvailabilityCalendar> ]   | | |
| |   |                                                      |       [ (Reads avail/unavail)  ]   | | |
| |   |   <Card (Tutor Credible Stats)>  <-- ADDED            |       [ (User picks a slot)    ]   | | |
| |   |     <h4>Tutor Stats</h4>                            |       <Button variant="primary">   | | |
| |   |     [ 150 Sessions Taught ] [ 25 Reviews ]           |         Book Now              | | |
| |   |     [ 4-Hour Response Time ]                         |       </Button>                   | | |
| |   |   </Card>                                            |       <div class="cta-grid">      | | |
| |   |                                                      |        [ Refer & Earn ] [ Contact ] | | |
| |   |                                                      |        [ Instant Booking ] [ Connect ] | | |
| |   |   <Card (Description)>                               |       </div>                      | | |
| |   |     <h4>About this session</h4>                       |     </Card>                       | | |
| |   |     <p>[Service Description from v4.0 form...]</p>    |   </Card>                         | | |
| |   |   </Card>                                            |                                   | | |
| |   |                                                      |                                   | | |
| |   |   <Card (Availability)>  <-- ADDED                   |                                   | | |
| |   |     <h4>This Listing's Availability</h4>               |                                   | | |
| |   |     [ <AvailabilitySection> (Read-Only) ]            |                                   | | |
| |   |     [ (Data from v4.0 Form) ]                        |                                   | | |
| |   |   </Card>                                            |                                   | | |
| |   |                                                      |                                   | | |
| |   |   <Card (Reviews)>                                   |                                   | | |
| |   |     <h4>Reviews (100)</h4>                          |                                   | | |
| |   |     [ <ReviewCard ... /> ]                           |                                   | | |
| |   |     [ <ReviewCard ... /> ]                           |                                   | | |
| |   |     [ <Button variant="secondary">Show all 100 reviews</Button> ] <-- ADDED | | |
| |   |   </Card>                                            |                                   | | |
| |   |                                                      |                                   | | |
| |   +------------------------------------------------------+-----------------------------------+ | |
| |                                                                                                | |
| |   (SECTION 3: 1-COLUMN RELATED LISTINGS)                                                       | |
| |                                                                                                | |
| |   <RelatedListingsCard> <-- ADDED                                                              | |
| |     <h4>You might also like</h4>                                                              | |
| |     <div class="horizontal-scroll-container">                                                  | |
| |       [ <ListingCard> ] [ <ListingCard> ] [ <ListingCard> ] [ See 50 more... ]               | |
| |     </div>                                                                                     | |
| |   </RelatedListingsCard>                                                                       | |
| |                                                                                                | |
| | </Container>                                                                                   | |
| |                                                                                                | |
| +------------------------------------------------------------------------------------------------+ |
| | <Footer (Standard Site Footer)>                                                                | |
| +------------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+

```

* * *

### 6.0 New Component Specifications (v4.1)

This refactor requires several new, high-value components.

- `apps/web/src/app/listings/[id]/page.tsx` **(New Page)**
  - **Architecture:** Server Component.
  - **Logic:** Fetches the complete `listing` data via `getListingById(id)`. This data **must** include the `listing_type`, `details: jsonb`, and joined `tutor: profile_id (*)` data. It then renders the layout and passes the `listing` object as props to the client components.
- `apps/web/src/app/components/listings/ListingImageGrid.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Logic:** Receives `hero_image_url` and `gallery_image_urls` (from migration `025_add_listing_mvp_fields.sql`) as props.
  - **Images 2 & 3** in the diagram are the first two URLs from the `gallery_image_urls` array.
  - Renders the 1-big-2-small responsive grid. A "Show all photos" button opens a `<Modal>` with a gallery carousel.
- `apps/web/src/app/components/listings/ListingHeader.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Logic:** Renders the `<h1>` title of the service. Below it, renders a new `<MetadataBar>` component with review count, location, and the "Save" (wishlist) and "Share" buttons.
- `apps/web/src/app/components/listings/TutorVerificationCard.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Props:** `profile: Profile`.
  - **Logic:** Renders a list of verified credentials with checkmark icons, as seen in `image_fd0e3f.png`. It checks fields like `phone_verified`, `email_confirmed`, and `dbs_status` from the `profiles` table.
- `apps/web/src/app/components/listings/TutorCredibleStats.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Props:** `tutorStats: { sessionsTaught: number, reviews: number, responseTime: string }`.
  - **Logic:** Renders a 2x2 grid of key trust metrics (e.g., "150 Sessions Taught"). This data will need a new API endpoint or be added to the `getListingById` fetch.
- `apps/web/src/app/components/listings/ListingAvailabilityCard.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Props:** `availability: AvailabilityPeriod[]`.
  - **Logic:** A **read-only** display component that reuses the visual styles of `AvailabilityFormSection.tsx` (see `image_8f1bea.png`) to show the listing-specific hours (e.g., "Mondays: 9:00 AM - 12:00 PM").
- `apps/web/src/app/components/listings/ReviewsSection.tsx` **(Update)**
  - **File:** `apps/web/src/app/components/profile/ReviewsSection.tsx`
  - **Logic:** This component will be refactored to be more generic. It will be updated to:
    1. Receive a `totalReviews` prop.
    2. Render a `<Button variant="secondary">Show all {totalReviews} reviews</Button>` at the bottom, which opens a modal.
- `apps/web/src/app/components/listings/RelatedListingsCard.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Logic:** Fetches 10-15 "matched" listings from a new API endpoint (`GET /api/listings/related?listing_id=...`).
  - **UI/UX:** Renders a full-width `<Card>` with a title ("You might also like") and a **horizontally scrolling container** holding `ListingCard` components. The last item is a "See all 50+ matches" link.
- `apps/web/src/app/components/listings/ActionCard.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`). **This is the most critical component.**
  - **Props:** `listing: Listing`.
  - **Styling:** This component's root is `position: sticky` and `top: var(--space-6)` (24px).
  - **Logic:** Contains a `switch (listing.listing_type)` to render the correct UI inside:
    - `case 'one-to-one'`**: (As shown in diagram)**
      - Renders `<PriceOptions>` showing "One-to-One" and "Group" fees.
      - Renders a new `<AvailabilityCalendar>` component.
      - Renders the `<CTAGrid>` with "Refer Me" and "Contact Me" buttons.
    - `case 'group-session'`**: (Variant)**
      - Renders `<PriceOptions>` showing "One-to-One" and "Group" fees.
      - Renders the specific schedule (e.g., "Mondays & Wednesdays, 6:00 PM - 7:00 PM").
      - Renders "Book Your Slot" `<Button>`.
    - `case 'workshop'`**: (Variant)**
      - Renders the `Event Date`, `Time`, and `Max Participants`.
      - Renders "Book Your Spot" `<Button>`.
    - `case 'study-package'`**: (Variant)**
      - Renders "Package Type" (e.g., "PDF Download") and "Buy Now" `<Button>`.
- `apps/web/src/app/components/listings/AvailabilityCalendar.tsx` **(New Component)**
  - **Architecture:** Client Component (`'use client'`).
  - **Props:** `listingId: string`, `availability: AvailabilityPeriod[]`, `unavailability: UnavailabilityPeriod[]`.
  - **Logic:**
    1. Renders a monthly calendar (e.g., `react-day-picker`).
    2. Fetches existing bookings (`GET /api/bookings?listing_id=...`) to know which slots are taken.
    3. Uses the `availability` (allow-list, from `AvailabilityFormSection.tsx`) and `unavailability` (block-list, from `UnavailabilityFormSection.tsx`) props to disable invalid days.
    4. When a user clicks an available day, it shows a list of available time slots (e.g., "9:00 AM", "10:00 AM").
    5. Manages the `selectedSlot` in `useState` and passes it up to the parent `ActionCard` to enable the "Book Session" button.