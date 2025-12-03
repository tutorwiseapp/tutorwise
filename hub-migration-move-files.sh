#!/bin/bash

# Run this shell script to instantly create the new folder structure and move all files to their Atomic Design locations.

# Base directory - adjust if running from a different location
BASE_DIR="apps/web/src/app/components"

echo "🚀 Starting Hub Architecture Migration..."
echo "📂 Base Directory: $BASE_DIR"

# --- 1. Create Directory Structure ---
echo "🛠  Creating Atomic Design Folder Structure..."

# Tier 1: Core UI Atoms
mkdir -p "$BASE_DIR/ui/actions"
mkdir -p "$BASE_DIR/ui/branding"
mkdir -p "$BASE_DIR/ui/data-display"
mkdir -p "$BASE_DIR/ui/feedback"
mkdir -p "$BASE_DIR/ui/forms"
mkdir -p "$BASE_DIR/ui/navigation"

# Tier 2: Hub System
mkdir -p "$BASE_DIR/hub/layout"
mkdir -p "$BASE_DIR/hub/sidebar/cards"
mkdir -p "$BASE_DIR/hub/content/HubRowCard"
mkdir -p "$BASE_DIR/hub/form"
mkdir -p "$BASE_DIR/hub/styles"

# Tier 3: Feature Modules
mkdir -p "$BASE_DIR/feature"
mkdir -p "$BASE_DIR/layout" 

# --- 2. Migrate UI Atoms (Tier 1) ---
echo "📦 Moving UI Atoms..."

# Actions
mv "$BASE_DIR/ui/Button.tsx" "$BASE_DIR/ui/actions/" 2>/dev/null
mv "$BASE_DIR/ui/Button.module.css" "$BASE_DIR/ui/actions/" 2>/dev/null
mv "$BASE_DIR/ui/IconButton.tsx" "$BASE_DIR/ui/actions/" 2>/dev/null

# Branding
mv "$BASE_DIR/shared/Logo.tsx" "$BASE_DIR/ui/branding/" 2>/dev/null
mv "$BASE_DIR/shared/Logo.module.css" "$BASE_DIR/ui/branding/" 2>/dev/null
mv "$BASE_DIR/shared/Logo.stories.tsx" "$BASE_DIR/ui/branding/" 2>/dev/null

# Data Display
mv "$BASE_DIR/ui/Card.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/Card.module.css" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/Chip.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/StatusBadge.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/StatusBadge.module.css" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/PageHeader.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/PageHeader.module.css" "$BASE_DIR/ui/data-display/" 2>/dev/null
# Move Reports items to Data Display
mv "$BASE_DIR/ui/reports/StatCard.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/reports/StatCard.module.css" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/reports/StatGrid.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/reports/StatGrid.module.css" "$BASE_DIR/ui/data-display/" 2>/dev/null
# Move Table to Data Display
mv "$BASE_DIR/ui/table/DataTable.tsx" "$BASE_DIR/ui/data-display/" 2>/dev/null
mv "$BASE_DIR/ui/table/DataTable.module.css" "$BASE_DIR/ui/data-display/" 2>/dev/null

# Feedback
mv "$BASE_DIR/ui/Modal.tsx" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ui/Modal.module.css" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ui/ConfirmDialog.tsx" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ui/ConfirmDialog.module.css" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ui/Message.tsx" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ui/Message.module.css" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/modals/VideoModal.tsx" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/modals/VideoModal.module.css" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ErrorBoundary.tsx" "$BASE_DIR/ui/feedback/" 2>/dev/null
mv "$BASE_DIR/ErrorBoundary.module.css" "$BASE_DIR/ui/feedback/" 2>/dev/null

# Forms (Consolidating ui/form and ui/picker)
mv "$BASE_DIR/ui/form/"* "$BASE_DIR/ui/forms/" 2>/dev/null
mv "$BASE_DIR/ui/picker/"* "$BASE_DIR/ui/forms/" 2>/dev/null

# Navigation
mv "$BASE_DIR/ui/Tabs.tsx" "$BASE_DIR/ui/navigation/" 2>/dev/null
mv "$BASE_DIR/ui/Tabs.module.css" "$BASE_DIR/ui/navigation/" 2>/dev/null
mv "$BASE_DIR/ui/nav/"* "$BASE_DIR/ui/navigation/" 2>/dev/null

# --- 3. Migrate Hub & Layout System (Tier 2) ---
echo "🏗  Moving Hub Templates & Renaming..."

# Hub Layout
mv "$BASE_DIR/ui/hub-layout/"* "$BASE_DIR/hub/layout/" 2>/dev/null
# Move specific Hub CSS to styles
mv "$BASE_DIR/hub/layout/hub-actions.module.css" "$BASE_DIR/hub/styles/" 2>/dev/null
mv "$BASE_DIR/hub/layout/hub-filters.module.css" "$BASE_DIR/hub/styles/" 2>/dev/null

# Hub Components
mv "$BASE_DIR/ui/hub-row-card/"* "$BASE_DIR/hub/content/HubRowCard/" 2>/dev/null
mv "$BASE_DIR/ui/hub-form/"* "$BASE_DIR/hub/form/" 2>/dev/null

# Sidebar Renaming & Moves
# ContextualSidebar -> HubSidebar
mv "$BASE_DIR/layout/sidebars/ContextualSidebar.tsx" "$BASE_DIR/hub/sidebar/HubSidebar.tsx" 2>/dev/null
mv "$BASE_DIR/layout/sidebars/ContextualSidebar.module.css" "$BASE_DIR/hub/sidebar/HubSidebar.module.css" 2>/dev/null

# Widgets -> Cards
mv "$BASE_DIR/layout/sidebars/components/SidebarStatsWidget.tsx" "$BASE_DIR/hub/sidebar/cards/HubStatsCard.tsx" 2>/dev/null
mv "$BASE_DIR/layout/sidebars/components/SidebarStatsWidget.module.css" "$BASE_DIR/hub/sidebar/cards/HubStatsCard.module.css" 2>/dev/null

mv "$BASE_DIR/layout/sidebars/components/SidebarActionWidget.tsx" "$BASE_DIR/hub/sidebar/cards/HubActionCard.tsx" 2>/dev/null
mv "$BASE_DIR/layout/sidebars/components/SidebarActionWidget.module.css" "$BASE_DIR/hub/sidebar/cards/HubActionCard.module.css" 2>/dev/null

mv "$BASE_DIR/layout/sidebars/components/SidebarQuickActionsWidget.tsx" "$BASE_DIR/hub/sidebar/cards/HubQuickActionsCard.tsx" 2>/dev/null
mv "$BASE_DIR/layout/sidebars/components/SidebarQuickActionsWidget.module.css" "$BASE_DIR/hub/sidebar/cards/HubQuickActionsCard.module.css" 2>/dev/null

mv "$BASE_DIR/layout/sidebars/components/SidebarComplexWidget.tsx" "$BASE_DIR/hub/sidebar/cards/HubComplexCard.tsx" 2>/dev/null
mv "$BASE_DIR/layout/sidebars/components/SidebarComplexWidget.module.css" "$BASE_DIR/hub/sidebar/cards/HubComplexCard.module.css" 2>/dev/null

# Global Layout
mv "$BASE_DIR/layout/sidebars/AppSidebar.tsx" "$BASE_DIR/layout/AppSidebar.tsx" 2>/dev/null
mv "$BASE_DIR/layout/sidebars/AppSidebar.module.css" "$BASE_DIR/layout/AppSidebar.module.css" 2>/dev/null

# --- 4. Migrate Feature Modules (Tier 3) ---
echo "🚚 Moving Feature Modules..."
FEATURES=(
  "account" "auth" "bookings" "caas" "dashboard" 
  "financials" "listings" "marketplace" "messages" 
  "network" "onboarding" "organisation" "payments" 
  "profile" "public-profile" "referrals" "reviews" 
  "students" "wiselists" "wisespace"
)

for feature in "${FEATURES[@]}"; do
  if [ -d "$BASE_DIR/$feature" ]; then
    mv "$BASE_DIR/$feature" "$BASE_DIR/feature/"
  fi
done

# --- 5. Cleanup ---
echo "🧹 Cleaning up empty directories..."
rm -rf "$BASE_DIR/ui/form"
rm -rf "$BASE_DIR/ui/picker"
rm -rf "$BASE_DIR/ui/nav"
rm -rf "$BASE_DIR/ui/reports"
rm -rf "$BASE_DIR/ui/table"
rm -rf "$BASE_DIR/ui/hub-layout"
rm -rf "$BASE_DIR/ui/hub-row-card"
rm -rf "$BASE_DIR/ui/hub-form"
rm -rf "$BASE_DIR/layout/sidebars"
rm -rf "$BASE_DIR/modals"
rm -rf "$BASE_DIR/shared"

echo "✅ File migration complete!"