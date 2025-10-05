#!/bin/bash
set -e

##############################################################################
# TutorWise Vercel Deployment Script
#
# IMPORTANT: Vercel Authentication Requirements
# ---------------------------------------------
# This script requires either:
# 1. User Access Token (for local development)
#    - Create at: https://vercel.com/account/tokens
#    - Full account access, no project selection needed
#    - Add to .env.local as VERCEL_TOKEN=your-token
#
# 2. Interactive login (vercel login)
#    - Opens browser for authentication
#    - Persists login locally
#
# For CI/CD, use Project Token in GitHub Secrets
#
# See: tools/scripts/VERCEL-AUTH-README.md for full documentation
##############################################################################

echo "🔷 TutorWise Vercel Deployment"
echo "=============================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📍 Project: $(pwd)"
echo "🔍 Vercel CLI: $(vercel --version)"

# Load Vercel token from .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    if grep -q "VERCEL_TOKEN" "$PROJECT_ROOT/.env.local"; then
        export $(grep "^VERCEL_TOKEN=" "$PROJECT_ROOT/.env.local" | xargs)
        echo "🔑 Vercel token loaded from .env.local"
    fi
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel."
    echo ""
    echo "🔐 Authentication Required:"
    echo ""
    echo "   Option 1: Use Access Token (Recommended)"
    echo "   ----------------------------------------"
    echo "   1. Go to: https://vercel.com/account/tokens"
    echo "   2. Click 'Create Token'"
    echo "   3. Name it (e.g., 'CLI Access')"
    echo "   4. Scope: Full Account (for all projects)"
    echo "   5. Copy token and add to .env.local:"
    echo "      VERCEL_TOKEN=your-token"
    echo ""
    echo "   Option 2: Interactive Login"
    echo "   ---------------------------"
    echo "   Run: vercel login"
    echo ""
    exit 1
fi

echo "👤 User: $(vercel whoami)"

# Check if project is linked
if [ ! -d ".vercel" ]; then
    echo "❓ Project not linked to Vercel. Linking..."
    vercel link
fi

# Determine deployment target
DEPLOY_TARGET="preview"
if [ "$1" == "prod" ] || [ "$1" == "production" ]; then
    DEPLOY_TARGET="production"
    echo "🚀 Deploying to PRODUCTION..."
else
    echo "🚀 Deploying to PREVIEW (test environment)..."
fi

echo ""
echo "📦 Deploying frontend..."

# Deploy the web app from apps/web directory
cd apps/web

if [ "$DEPLOY_TARGET" == "production" ]; then
    vercel --prod
else
    vercel
fi

echo ""
echo "✅ Vercel deployment complete!"
echo ""
echo "🔗 View deployment:"
echo "   - Dashboard: https://vercel.com"
echo "   - Or run: vercel ls"
echo ""
echo "📊 Check logs:"
echo "   - Run: vercel logs [deployment-url]"