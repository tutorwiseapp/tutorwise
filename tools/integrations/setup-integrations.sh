#!/bin/bash
set -e

echo "Setting up TutorWise CLI Integrations..."
echo "========================================"

# Navigate to the integrations directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Make all scripts executable
chmod +x *.sh

echo ""
echo "Installing CLI Tools..."

# Install deployment tools
echo ""
echo "=== Deployment Tools ==="
./install-railway.sh
echo ""
./install-vercel.sh

# Install database tools
echo ""
echo "=== Database Tools ==="
./install-supabase.sh

# Install testing tools
echo ""
echo "=== Testing Tools ==="
./install-playwright.sh
echo ""
./install-percy.sh

echo ""
echo "Integration setup complete!"
echo ""
echo "Next steps for authentication:"
echo "   1. Railway: railway login"
echo "   2. Vercel: vercel login"
echo "   3. Supabase: supabase login"
echo "   4. Percy: Set PERCY_TOKEN environment variable"
echo ""
echo "Available commands:"
echo "   Deployment:"
echo "     - tools/scripts/railway-deploy.sh"
echo "     - tools/scripts/vercel-deploy.sh"
echo "   Database:"
echo "     - tools/scripts/supabase-db-management.sh"
echo "   Testing:"
echo "     - tools/scripts/playwright-test-e2e.sh"
echo "     - tools/scripts/percy-test-visual.sh"
echo "   Monitoring:"
echo "     - tools/scripts/health-check.sh"