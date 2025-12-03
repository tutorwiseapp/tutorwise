# Hub Layout Architecture Fixes - December 2, 2025

## Summary
Fixed the 3-column hub layout architecture to ensure proper alignment, spacing, and border positioning across all hub pages (Bookings, Listings, Referrals, etc.).

## Issues Fixed

### 1. Tab Horizontal Border Line Not Touching Left Edge
**Problem**: The horizontal border line under tabs was not extending to the left edge of the viewport.

**Root Cause**: Tabs are direct children of `mainArea` (not inside `contentContainer`), but the border line positioning was incorrect.

**Solution**:
- Two-layer structure: outer container (`.filterTabsContainer`) + inner wrapper (`.filterTabs`)
- Outer container has `border-bottom` with NO padding - border extends from left edge (0) to right edge (100%)
- Inner wrapper has `padding-left: 1rem` and `padding-right: 1rem` to align tab buttons with header content
- Individual tab buttons use `margin-bottom: -2px` to overlay their active border on top of container border

### 2. Sidebar Not Full Height
**Problem**: Sidebar was not extending from top to bottom of viewport.

**Root Cause**: Sidebar was using `height: 100vh` with `position: sticky` which created gaps.

**Solution**:
- Changed to `height: 100%` (inherits from parent layoutWrapper)
- Removed `position: sticky` and `top: 0`
- Set layoutWrapper to `height: 100%` and mainArea to `height: 100%`

### 3. Content Padding Inconsistency
**Problem**: Content padding was not consistent across components.

**Solution**: Standardized all padding to `1rem`:
- `contentContainer`: `padding: 1rem` (top, left, right)
- `headerRow`: `padding: 1rem` (left, right)
- `filterTabs`: `padding: 1rem` (left, right)

### 4. Layout Structure
**Final Structure**:
```
layoutWrapper (flex row, height: 100%)
├── mainArea (flex: 1, flex column, height: 100%, overflow-y: auto)
│   ├── header (padding: 0 1rem)
│   ├── tabs (padding: 0 1rem, ::after for border line)
│   └── contentContainer (padding: 1rem)
│       └── children (cards, lists, etc.)
└── sidebarPanel (width: 320px, height: 100%, overflow-y: auto)
```

## Files Modified

### 1. HubPageLayout.module.css
```css
.layoutWrapper {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
}

.mainArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  height: 100%;
}

.contentContainer {
  flex: 1;
  width: 100%;
  padding-top: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
}

.sidebarPanel {
  width: 320px;
  min-width: 320px;
  height: 100%;
  background-color: #ffffff;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
  flex-shrink: 0;
}
```

### 2. HubHeader.module.css
```css
.header {
  background-color: #ffffff;
  margin-bottom: 0;
}

.headerRow {
  padding-left: 1rem;
  padding-right: 1rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

### 3. HubTabs.module.css & HubTabs.tsx
```css
/* Outer container - Border extends full width from left edge to right edge */
.filterTabsContainer {
  position: relative;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1rem;
}

/* Inner wrapper - Contains tab buttons with padding for alignment */
.filterTabs {
  display: flex;
  gap: 0.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
  overflow-x: auto;
  position: relative;
}

.filterTab {
  position: relative;
  z-index: 1;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px; /* Overlay tab border on top of container border */
  /* Other styles... */
}
```

```tsx
// Two-layer structure in component
<div className={styles.filterTabsContainer}>
  <div className={styles.filterTabs}>
    {tabs.map((tab) => (
      <button className={styles.filterTab}>...</button>
    ))}
  </div>
</div>
```

### 4. (authenticated)/layout.module.css (CRITICAL FIX)
```css
/* Main Content Area (center column) - CRITICAL: Zero padding */
.mainContent {
  flex: 1;
  margin-left: 240px; /* Width of AppSidebar on desktop */
  margin-right: 300px; /* Width of ContextualSidebar on desktop */
  padding: 0; /* CRITICAL: No padding - Hub components handle their own spacing */
  overflow-y: auto;
}
```

**Why This Was Critical**:
- The authenticated layout previously had `padding: 0.75rem 2rem 2rem 2rem` (2rem left/right padding)
- This padding prevented the tab border from reaching the left edge of the viewport
- Setting `padding: 0` allows HubPageLayout components to control their own spacing
- Border on `.filterTabsContainer` now extends from true left edge (0) to right edge (100%)

## Key Principles

1. **Zero Padding on Layout Wrapper**: Authenticated layout must have `padding: 0` - hub components control their own spacing
2. **Two-Layer Tab Structure**: Outer container for border (no padding), inner wrapper for tab buttons (with padding)
3. **Consistent Inner Padding**: All hub components use `1rem` padding for horizontal spacing (header, tabs, content)
4. **Full Height Layout**: Use `height: 100%` with parent-child relationship instead of `100vh`
5. **Centralized Layout Logic**: All layout logic in hub components, feature pages only provide content

## Testing Checklist

- [x] Tab horizontal border touches left edge
- [x] Tab horizontal border extends to sidebar
- [x] Sidebar is full height from top to bottom
- [x] Header, tabs, and content are aligned with consistent 1rem padding
- [x] No gaps between components
- [x] Layout is responsive (mobile, tablet, desktop)

## Next Steps

Apply this pattern to all 15 hub pages:
- Bookings ✓
- Listings ✓
- Referrals
- Reviews
- Network
- Financials
- Messages
- Wiselists
- My Students
- Organisation
- Account
- Payments
- Dashboard
- WiseSpace

## Notes

- The production build (commit 198f5b6) had a different architecture with header/tabs outside mainLayout
- We reverted to keep header/tabs inside mainArea for better component encapsulation
- All layout logic is now centralized in HubPageLayout component
