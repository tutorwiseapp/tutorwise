# Feature Folder Renaming Summary

**Date**: 2025-12-12
**Purpose**: Align documentation folder names with actual codebase structure

---

## ✅ Completed Renames

### 1. `authentication/` → `auth/`
**Reason**: Component folder and page routes use `auth`, not `authentication`

**Codebase Evidence**:
- Components: `apps/web/src/app/components/feature/auth/`
- Pages: `apps/web/src/app/auth/` (login, signup, forgot-password, etc.)

**Impact**:
- Feature index updated: `[auth](./auth/)`
- Reverse engineering plan updated

---

### 2. `student-onboarding/` → `students/`
**Reason**: Component folder is `students`, authenticated page is `my-students`

**Codebase Evidence**:
- Components: `apps/web/src/app/components/feature/students/`
- Pages: `apps/web/src/app/(authenticated)/my-students/`

**Impact**:
- Feature index updated: `[students](./students/)`

---

### 3. `homepage-marketplace/` → `marketplace/`
**Reason**: Page route is simply `marketplace`

**Codebase Evidence**:
- Pages: `apps/web/src/app/marketplace/`
- Components: `apps/web/src/app/components/feature/marketplace/`

**Impact**:
- Feature index updated: `[marketplace](./marketplace/)`

---

### 4. `ratings-and-reviews/` → Consolidated into `reviews/`
**Reason**: Component and page folders use `reviews`, duplicate folder removed

**Codebase Evidence**:
- Components: `apps/web/src/app/components/feature/reviews/`
- Pages: `apps/web/src/app/(authenticated)/reviews/`
- Existing docs: `reviews/reviews-solution-design-v4.5.md`

**Impact**:
- Removed duplicate `ratings-and-reviews/` folder
- Consolidated into single `reviews/` folder
- Feature index updated to show only `[reviews](./reviews/)`

---

## 📊 Alignment Status

### ✅ Aligned Folders (15 features)
These folders now match the codebase exactly:

1. **account** - `apps/web/src/app/(authenticated)/account/`
2. **auth** - `apps/web/src/app/auth/` (renamed from authentication)
3. **bookings** - `apps/web/src/app/(authenticated)/bookings/`
4. **dashboard** - `apps/web/src/app/(authenticated)/dashboard/`
5. **financials** - `apps/web/src/app/(authenticated)/financials/`
6. **listings** - `apps/web/src/app/(authenticated)/listings/`
7. **marketplace** - `apps/web/src/app/marketplace/` (renamed from homepage-marketplace)
8. **messages** - `apps/web/src/app/(authenticated)/messages/`
9. **network** - `apps/web/src/app/(authenticated)/network/`
10. **onboarding** - `apps/web/src/app/onboarding/`
11. **organisation** - `apps/web/src/app/(authenticated)/organisation/`
12. **payments** - `apps/web/src/app/(authenticated)/payments/`
13. **public-profile** - `apps/web/src/app/public-profile/`
14. **referrals** - `apps/web/src/app/(authenticated)/referrals/`
15. **reviews** - `apps/web/src/app/(authenticated)/reviews/` (consolidated)
16. **students** - `apps/web/src/app/components/feature/students/` (renamed from student-onboarding)
17. **wiselists** - `apps/web/src/app/(authenticated)/wiselists/`
18. **wisespace** - `apps/web/src/app/(authenticated)/wisespace/`

### 🔍 UI Component Folders (Not Feature Folders)
These are UI components, not standalone features - keep for component documentation:

- **context-sidebar** - Sidebar UI component
- **hub-form** - Form UI component for hub
- **hub-row-card** - Card UI component for hub
- **navigation-menu** - Navigation UI component

### 📝 Planned Features (No Code Yet)
These folders exist for planned features with no current implementation:

- **admin-dashboard** - Admin interface (planned)
- **ai-powered** - AI features (planned)
- **branding** - Branding/design system docs
- **free-help-now** - Free help feature (planned)
- **instant-bookings** - Instant booking feature (planned)
- **matching-engine** - Matching algorithm (backend)
- **notifications** - Notification system (planned)
- **profile-graph** - Profile graph visualization (planned)
- **recommendations** - Recommendation engine (planned)
- **reporting** - Reporting dashboard (planned)
- **role-management** - Role management system (planned)
- **search-filters** - Search/filter system (needs investigation)
- **settings** - Settings pages (may be part of account)
- **transactions** - Transaction history (may be part of payments)
- **your-home** - Home dashboard (page exists, needs docs)

### 🔴 Deprecated Features
These should be moved to `Docs/archived/`:

- **caas** - Deprecated (2024-11-16)
- **caas-video** - Deprecated (2024-11-16)

---

## 📝 Updated Documentation

### 1. Feature Index (`Docs/feature/README.md`)
**Changes**:
- Updated `authentication` → `auth`
- Updated `homepage-marketplace` → `marketplace`
- Updated `student-onboarding` → `students`
- Removed duplicate `ratings-and-reviews` entry
- Updated `reviews` to show existing solution-design v4.5

### 2. Reverse Engineering Plan (`Docs/REVERSE-ENGINEERING-PLAN.md`)
**Changes**:
- Updated Tier 1 feature #2: `authentication` → `auth` (renamed from authentication)
- Updated `public-profile` status to ✅ COMPLETED (2025-12-12)
- Added documentation files: README.md, implementation.md, ai-prompt.md, components.md

---

## 🎯 Benefits

1. **Consistency**: Documentation folder names now match component and page folder names
2. **Discoverability**: Developers can find docs by looking at code folder structure
3. **Clarity**: No confusion between `authentication` vs `auth`, `student-onboarding` vs `students`
4. **Reduced Duplication**: Consolidated `ratings-and-reviews` into `reviews`

---

## 🚀 Next Steps

### Immediate
1. ✅ Renames completed
2. ✅ Feature index updated
3. ✅ Reverse engineering plan updated

### Future
1. Move deprecated features to `Docs/archived/`
   - `caas/` → `Docs/archived/features/caas/`
   - `caas-video/` → `Docs/archived/features/caas-video/`

2. Investigate ambiguous folders:
   - `search-filters` - Is this the same as `saved` searches?
   - `settings` - Should this be consolidated into `account`?
   - `transactions` - Should this be part of `financials` or `payments`?

3. Create README.md files for all aligned features

---

## 📋 Renaming Convention Established

**Rule**: Documentation folder names MUST match the primary codebase reference:

1. **Component folder exists**: Use component folder name
   - Example: `apps/web/src/app/components/feature/auth/` → `Docs/feature/auth/`

2. **Page route exists (no component)**: Use page route name
   - Example: `apps/web/src/app/marketplace/` → `Docs/feature/marketplace/`

3. **Both exist**: Use the shorter, more common name
   - Example: Component `students/` + Page `my-students/` → `Docs/feature/students/`

4. **Multiple words**: Use single-word or kebab-case matching code
   - ✅ `auth` (matches codebase)
   - ❌ `authentication` (doesn't match)

---

**Last Updated**: 2025-12-12
**Status**: ✅ Complete
**Files Changed**: 4 folder renames, 2 documentation files updated
