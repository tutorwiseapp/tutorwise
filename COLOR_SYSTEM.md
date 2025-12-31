# Tutorwise Color System Documentation

**Created:** 2025-12-31
**Purpose:** Document all colors used across the platform and standardize via CSS variables

## Current Color Audit Summary

Total CSS files analyzed: 336
Total unique color values: 200+
Most common colors (top 30):

| Count | Color | Usage |
|-------|-------|-------|
| 481 | `#6b7280` | Gray 500 - Secondary text, borders |
| 299 | `#006c67` | Primary brand color (teal) |
| 269 | `#1f2937` | Gray 800 - Dark text |
| 267 | `#ffffff` | White - Backgrounds, cards |
| 160 | `#f9fafb` | Gray 50 - Light backgrounds |
| 160 | `#9ca3af` | Gray 400 - Placeholder text |
| 158 | `#374151` | Gray 700 - Medium dark text |
| 147 | `#E6F0F0` | Teal 50 - Light teal background |
| 142 | `#f3f4f6` | Gray 100 - Card backgrounds |
| 142 | `#111827` | Gray 900 - Headings, dark UI |
| 135 | `#4B4B4B` | Custom dark gray |
| 85 | `#f0f0f0` | Light gray background |
| 65 | `#dc2626` | Red 600 - Error, danger |
| 57 | `#005550` | Teal 700 - Dark teal |
| 55 | `#e5e7eb` | Gray 200 - Light borders |
| 53 | `#d1d5db` | Gray 300 - Borders, dividers |
| 50 | `#3b82f6` | Blue 500 - Info, links |
| 49 | `#d1fae5` | Green 100 - Success background |
| 46 | `#fef3c7` | Amber 100 - Warning background |
| 46 | `#10b981` | Green 500 - Success |
| 42 | `#fee2e2` | Red 100 - Error background |
| 42 | `#059669` | Green 600 - Success dark |
| 40 | `#8E8E8E` | Custom medium gray |
| 37 | `#F5F5F5` | Light background |
| 35 | `#92400e` | Amber 800 - Warning text |
| 33 | `#065f46` | Green 800 - Success darker |
| 32 | `rgba(0, 0, 0, 0.5)` | Black 50% opacity - Overlays |
| 32 | `#e0e0e0` | Light gray |
| 29 | `#991b1b` | Red 800 - Error dark |

## Color Categories

### 1. Brand Colors (Teal)
- **Primary**: `#006C67` (existing: `--color-primary`)
- **Primary Accent**: `#4CAEAD` (existing: `--color-primary-accent`)
- **Primary Light**: `#E0F2F1` / `#E6F0F0` (existing: `--color-primary-light`)
- **Primary Dark**: `#005550`
- **Primary Darker**: Similar to `#3A9B9A` (existing: `--color-primary-accent-dark`)

### 2. Gray Scale (Tailwind-based)
Following Tailwind's gray scale for consistency:
- **Gray 50**: `#f9fafb` (lightest backgrounds)
- **Gray 100**: `#f3f4f6` (card backgrounds)
- **Gray 200**: `#e5e7eb` (light borders)
- **Gray 300**: `#d1d5db` (borders, dividers)
- **Gray 400**: `#9ca3af` (placeholder text)
- **Gray 500**: `#6b7280` (secondary text)
- **Gray 600**: `#4b5563` (body text)
- **Gray 700**: `#374151` (medium dark text)
- **Gray 800**: `#1f2937` (dark text)
- **Gray 900**: `#111827` (headings, darkest)

### 3. Semantic Colors

#### Success (Green)
- **Success 50**: `#f0fdf4` (lightest background)
- **Success 100**: `#d1fae5` (light background)
- **Success 500**: `#10b981` (primary success) - existing: `--color-success`
- **Success 600**: `#059669` (success hover)
- **Success 700**: `#047857` (success active)
- **Success 800**: `#065f46` (success text dark)
- **Success Text**: `#137333` (existing: `--color-success-text`)
- **Success Background**: `#e8f5e8` (existing: `--color-success-bg`)
- **Success Border**: `#c4e7c4` (existing: `--color-success-border`)

#### Error/Danger (Red)
- **Error 50**: `#fef2f2` (lightest background)
- **Error 100**: `#fee2e2` (light background)
- **Error 500**: `#ef4444` (primary error)
- **Error 600**: `#dc2626` (error hover) - most common
- **Error 700**: `#b91c1c` (error active)
- **Error 800**: `#991b1b` (error text dark)
- **Error Text**: `#d93025` (existing: `--color-error-text`)
- **Error Background**: `#fce8e6` (existing: `--color-error-bg`)
- **Error Border**: `#f5c6cb` (existing: `--color-error-border`)

#### Warning (Amber)
- **Warning 50**: `#fffbeb` (lightest background)
- **Warning 100**: `#fef3c7` (light background)
- **Warning 500**: `#f59e0b` (primary warning)
- **Warning 600**: `#d97706` (warning hover)
- **Warning 700**: `#b45309` (warning active)
- **Warning 800**: `#92400e` (warning text dark)
- **Warning Text**: `#b06000` (existing: `--color-warning`)
- **Warning Background**: `#fef7e0` (existing: `--color-warning-bg`)
- **Warning Border**: `#fdd663` (existing: `--color-warning-border`)

#### Info (Blue)
- **Info 50**: `#eff6ff` (lightest background)
- **Info 100**: `#dbeafe` (light background)
- **Info 500**: `#3b82f6` (primary info)
- **Info 600**: `#2563eb` (info hover)
- **Info 700**: `#1d4ed8` (info active)
- **Info 800**: `#1e40af` (info text dark)

### 4. Special Purpose Colors

#### Accents
- **Pink Accent**: `#fde7f3` (existing: `--color-accent-pink`)

#### Overlays
- **Overlay Dark**: `rgba(0, 0, 0, 0.5)` (modal overlays)
- **Overlay Light**: `rgba(255, 255, 255, 0.9)` (light overlays)

#### Pure Colors
- **White**: `#ffffff`
- **Black**: `#000000`

## Migration Plan

### Phase 1: Add Missing CSS Variables ✅ NEXT
Extend `apps/web/src/app/globals.css` with comprehensive color system

### Phase 2: Update Component Styles
Systematically replace hardcoded colors with CSS variables across:
- Admin components (9 files cleaned)
- Hub components
- Feature components
- UI components

### Phase 3: Remove Hardcoded Colors
Search and replace remaining hardcoded colors with variables

### Phase 4: Validation
- Run build to ensure no regressions
- Visual QA of all pages
- Document any exceptions

## Benefits

1. **Consistency**: Single source of truth for all colors
2. **Maintainability**: Change colors in one place
3. **Theming**: Easy to add dark mode or alternative themes
4. **Accessibility**: Centralized place to ensure WCAG contrast ratios
5. **Developer Experience**: Autocomplete and clear naming

## Notes

- Some components use Tailwind utility classes which are acceptable
- Focus on CSS module files for variable conversion
- Preserve rgba() for opacity variations
- Document any color exceptions in this file
