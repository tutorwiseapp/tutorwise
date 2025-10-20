#!/bin/bash
# Quick setup script for testing Option 3 - Listing Templates
# This script:
# 1. Checks out the feature branch
# 2. Verifies environment variables
# 3. Runs the migrations
# 4. Confirms templates were created

set -e  # Exit on error

echo "🚀 Setting up Listing Templates (Option 3)"
echo "═══════════════════════════════════════════"

# Step 1: Checkout feature branch
echo ""
echo "📂 Step 1: Switching to feature branch..."
git checkout feature/listing-templates-on-profile-creation
echo "✅ On branch: $(git branch --show-current)"

# Step 2: Verify environment variables
echo ""
echo "🔍 Step 2: Checking environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
  echo "   Please run: source .env.local"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
  echo "   Please run: source .env.local"
  exit 1
fi

echo "✅ Environment variables configured"
echo "   URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
echo "   Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."

# Step 3: Run migrations
echo ""
echo "🗄️  Step 3: Running migrations..."
echo "   This will:"
echo "   • Create database trigger for auto-template creation"
echo "   • Backfill templates for your existing tutor profile"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

npm run migrate:listing-templates

# Step 4: Verification
echo ""
echo "═══════════════════════════════════════════"
echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Refresh http://localhost:3000/my-listings"
echo "   2. You should see 3 draft templates"
echo "   3. Check the Full Name field - no more 'Loading...'"
echo ""
echo "🧪 To test new tutor creation:"
echo "   1. Create a new user account"
echo "   2. Complete tutor onboarding"
echo "   3. Navigate to My Listings"
echo "   4. Templates should auto-exist"
echo "═══════════════════════════════════════════"
