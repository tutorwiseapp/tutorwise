#!/bin/bash

# =============================================================================
# Environment Variables Sync Script
# =============================================================================
# Purpose: Smart merge of .env.example updates into .env.local
# Usage: ./tools/scripts/setup/sync-env.sh
#
# This script:
# - Creates .env.local from .env.example for new developers
# - Adds new variables from .env.example to existing .env.local (non-destructive)
# - Preserves all existing values in .env.local
# - Provides a report of what was added
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Print functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    print_error ".env.example not found in project root"
    exit 1
fi

# Scenario 1: New developer - .env.local doesn't exist
if [ ! -f ".env.local" ]; then
    print_info "Creating new .env.local from .env.example..."
    cp .env.example .env.local
    print_success "Created .env.local from template"
    echo ""
    print_warning "IMPORTANT: Please update .env.local with your actual values:"
    echo "  1. Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    echo "  2. Database passwords (NEO4J_PASSWORD, REDIS_PASSWORD)"
    echo "  3. API keys for services you're using"
    echo ""
    print_info "Run 'npm run dev' when ready to start development"
    exit 0
fi

# Scenario 2: Existing developer - check for new variables
print_info "Checking for new environment variables in .env.example..."

# Create temporary file to store new variables
TEMP_FILE=$(mktemp)
NEW_VARS_FOUND=false

# Extract all variable names from .env.example (ignoring comments and empty lines)
grep -E '^[A-Z_][A-Z0-9_]*=' .env.example | cut -d= -f1 | while read var; do
    # Check if variable exists in .env.local
    if ! grep -q "^${var}=" .env.local; then
        echo "$var" >> "$TEMP_FILE"
        NEW_VARS_FOUND=true
    fi
done

# Read the temp file to check if any new variables were found
if [ ! -s "$TEMP_FILE" ]; then
    print_success ".env.local is up to date! No new variables found."
    rm -f "$TEMP_FILE"
    exit 0
fi

# New variables found - report and add them
echo ""
print_warning "Found new variables in .env.example that are missing in .env.local:"
echo ""

# Create a backup of .env.local
BACKUP_FILE=".env.local.backup.$(date +%Y%m%d_%H%M%S)"
cp .env.local "$BACKUP_FILE"
print_info "Created backup: $BACKUP_FILE"
echo ""

# Count of new variables
NEW_VAR_COUNT=$(wc -l < "$TEMP_FILE" | tr -d ' ')

# Add new variables to .env.local with their context from .env.example
echo "" >> .env.local
echo "# ============================================================================" >> .env.local
echo "# Auto-added from .env.example on $(date '+%Y-%m-%d %H:%M:%S')" >> .env.local
echo "# Please update these values with your actual credentials" >> .env.local
echo "# ============================================================================" >> .env.local

# Process each new variable
cat "$TEMP_FILE" | while read var; do
    echo "  + $var"
    echo "" >> .env.local

    # Extract the variable line and surrounding comments from .env.example
    # Get 5 lines before the variable (for comments) and the variable line itself
    grep -B 5 "^${var}=" .env.example | tail -6 >> .env.local
done

echo ""
print_success "Added $NEW_VAR_COUNT new variable(s) to .env.local"
echo ""
print_warning "ACTION REQUIRED:"
echo "  1. Open .env.local in your editor"
echo "  2. Scroll to the bottom to see newly added variables"
echo "  3. Replace placeholder values with your actual credentials"
echo ""
print_info "Backup saved to: $BACKUP_FILE"

# Cleanup
rm -f "$TEMP_FILE"

exit 0
