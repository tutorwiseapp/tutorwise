# Tutorwise Figma Design Overview

**File Name:** Tutorwise
**Last Modified:** October 3, 2025 08:03:04 UTC
**Version:** 2270604005695143438
**File Key:** Z3QO9PDyrNlSEViFya8Q9v

**Direct Link:** https://www.figma.com/file/Z3QO9PDyrNlSEViFya8Q9v/Tutorwise

---

## Summary

The Figma design file contains **3 pages** with a total of **177 frames** covering the complete Tutorwise platform design including:
- Desktop application (85 frames)
- Design system and components (46 frames each in backup and main design system)
- Role-based dashboards (Client, Tutor, Agent)
- Service listing components (Request Lessons, Post Jobs, Group Sessions, Courses)

---

## Page 1: Tutorwise Desktop (85 Frames)

### User Flows & States

#### **Authentication & Onboarding**
- Signup and Login
- Homepage - Logged Out Profile
- Home - Clients - Logged Out

#### **Client Views**
- Home - Clients - Logged In - Mike Quinn
- Home > Clients > Mike Quinn
- Account > Client > Personal Info
- Account > Client > Professional Info
- Account > Client > Settings

#### **Tutor Views**
- Home > Tutors > John Lee
- Account > Tutor > Personal Info
- Account > Tutor > Professional Info
- Account > Tutor > Settings

#### **Agent Views**
- Home > Agent > Clare Brown
- Account > Agent > Personal Info
- Account > Agent > Professional Info
- Account > Agent > Settings

#### **Additional Features**
- Refer Tutors
- Network and Connections (2 variations)

**Note:** 75 additional frames not listed (likely detail screens, modals, components)

---

## Page 2: Tutorwise Desktop Backup (46 Frames)

### Design System Components

#### **Foundation Elements**
- Type Scale
- Colour Scheme
- Grids & Spacers
- Desktop Grid
- Android Compact - Mobile
- Colour and Typography

#### **Reusable Components**
- Component - Title Section and Card Menu
- Helper Components

### Service Listing Components

#### **Client Services**
- Dashboard REQUEST LESSONS table components
- `dashboard_client_request-lesons_listings` (Component)
- Home > Clients > Request Lessons > New Request (Component)

#### **Agent Services**
- Dashboard POST JOBS table components
- `dashboard_agent_post-jobs_listings` (Component)
- Dashboard POST GROUP SESSIONS table components
- `dashboard_agent_post-group-sessions_listings` (Component)
- Dashboard SELL COURSES table components
- `dashboard_agent_sell-courses_listings` (Component)

#### **Profile Components**
- Home > Tutors > John Lee (Component)
- Account > Tutor > Personal Info

---

## Page 3: Design System (46 Frames)

**Mirror of Desktop Backup page** - Contains the same design system components and service listing templates for consistency.

### Key Components Include:

1. **Typography & Colors**
   - Type Scale definitions
   - Colour Scheme palette
   - Colour and Typography guidelines

2. **Layout System**
   - Desktop Grid
   - Android Compact - Mobile
   - Grids & Spacers

3. **Service Listing Templates**
   - Request Lessons (Client)
   - Post Jobs (Agent)
   - Post Group Sessions (Agent)
   - Sell Courses (Agent)

---

## Design Insights

### 1. **Role-Based Architecture**
The design clearly separates three distinct user roles:
- **Clients** - Can request lessons
- **Tutors** - Provide tutoring services
- **Agents** - Can post jobs, group sessions, and sell courses

### 2. **Service Listing Types** (Aligns with Roadmap)

The Figma design includes components for **4 service types**:

| Service Type | User Role | Component Name |
|-------------|-----------|----------------|
| Request Lessons | Client | `dashboard_client_request-lesons_listings` |
| Post Jobs | Agent | `dashboard_agent_post-jobs_listings` |
| Post Group Sessions | Agent | `dashboard_agent_post-group-sessions_listings` |
| Sell Courses | Agent | `dashboard_agent_sell-courses_listings` |

**This aligns with the Confluence roadmap's "One Page per Service Listing" strategy.**

### 3. **Account Structure**
Each role has three account sections:
- **Personal Info** - Basic profile information
- **Professional Info** - Role-specific professional details
- **Settings** - Account preferences

**This matches the "basic profile + detailed listings" architecture from the roadmap.**

### 4. **Design System Maturity**
- Complete typography scale
- Defined color scheme
- Grid system for desktop and mobile
- Reusable component library
- Modular dashboard tables

### 5. **Network & Referral Features**
- "Refer Tutors" screen
- "Network and Connections" views
- Supports the graph-based trust/referral system mentioned in roadmap

---

## Alignment with Technical Documentation

### ✅ Matches Profile & Service Listing Design
The Figma design confirms:
- Separate Personal Info vs Professional Info screens
- Service listing management dashboards
- Multiple listing types per user role

### ✅ Matches Roadmap Architecture
- One page per service type (Request Lessons, Post Jobs, etc.)
- Consistent modular structure across listing types
- Client request system (Request Lessons)
- Agent marketplace (Jobs, Group Sessions, Courses)

### ✅ Design System Supports Implementation
- Components are already defined as reusable elements
- Grid system supports responsive implementation
- Typography and color tokens ready for CSS/Tailwind

---

## Implementation Notes

### Component Hierarchy
```
Tutorwise Desktop (Main App)
├── Authentication
│   ├── Signup and Login
│   └── Homepage - Logged Out
├── Client Dashboard
│   ├── Home - Clients - Logged In
│   ├── Request Lessons
│   └── Account (Personal/Professional/Settings)
├── Tutor Dashboard
│   ├── Home - Tutors
│   └── Account (Personal/Professional/Settings)
├── Agent Dashboard
│   ├── Home - Agent
│   ├── Post Jobs
│   ├── Post Group Sessions
│   ├── Sell Courses
│   └── Account (Personal/Professional/Settings)
└── Shared Features
    ├── Refer Tutors
    └── Network and Connections
```

### Design System Structure
```
Design System
├── Foundation
│   ├── Type Scale
│   ├── Colour Scheme
│   ├── Grids & Spacers
│   └── Desktop/Mobile Grids
├── Components
│   ├── Title Section and Card Menu
│   ├── Helper Components
│   └── Dashboard Table Components
└── Service Templates
    ├── Request Lessons (Client)
    ├── Post Jobs (Agent)
    ├── Post Group Sessions (Agent)
    └── Sell Courses (Agent)
```

---

## Recommendations

### 1. **Export Design Tokens**
- Extract color variables from "Colour Scheme" to CSS/Tailwind config
- Convert "Type Scale" to typography system
- Map "Grids & Spacers" to spacing scale

### 2. **Component Library Priority**
Build these Figma components as React components first:
1. Dashboard table components (shared across all listing types)
2. Title Section and Card Menu
3. Service listing forms (Request Lessons, Post Jobs, etc.)

### 3. **Responsive Strategy**
- Desktop Grid already defined
- Android Compact - Mobile present
- Need to verify intermediate breakpoints (tablet)

### 4. **Missing Designs to Request**
- Booking flow after match acceptance
- Payment/checkout screens
- Messaging/communication interface
- Search and filters ("Home" marketplace page mentioned in roadmap)
- Profile public view (what other users see)

### 5. **Design Handoff Needs**
- Export all components as development-ready assets
- Document interaction states (hover, active, disabled)
- Define animation/transition specifications
- Create spacing/sizing specifications

---

## Next Steps

1. **Sync Figma to Code**
   - Use Figma API to extract design tokens programmatically
   - Set up Figma-to-Code pipeline (Figma Tokens plugin or similar)

2. **Build Component Library**
   - Start with Design System page components
   - Use Storybook for component development and documentation

3. **Implement Role-Based Dashboards**
   - Client dashboard with Request Lessons
   - Tutor dashboard with service management
   - Agent dashboard with Jobs/Sessions/Courses

4. **Verify Design Completeness**
   - Check if matching/search interface is designed
   - Confirm booking flow exists
   - Verify all service listing creation flows

---

## Quick Links

- **Figma File:** https://www.figma.com/file/Z3QO9PDyrNlSEViFya8Q9v/Tutorwise
- **Design Summary JSON:** [figma-design-summary.json](figma-design-summary.json)
- **Related Docs:**
  - [Profile and Service Listing Management](../features/profile-and-service-listing-management.md)
  - [Tutorwise Roadmap (Confluence)](../features/tutorwise-roadmap-confluence.md)
