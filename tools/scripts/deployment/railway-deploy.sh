#!/bin/bash
set -e

##############################################################################
# TutorWise Railway Deployment Script
#
# IMPORTANT: Railway Authentication Requirements
# -----------------------------------------------
# This script requires an ACCOUNT TOKEN (not a Project Token) for CLI operations.
#
# Token Types:
# - ACCOUNT TOKEN: Required for CLI commands (whoami, link, status, up, etc.)
#   * Has full account access
#   * No expiry date
#   * Create at: https://railway.app/account/tokens
#   * Do NOT select a project when creating
#
# - PROJECT TOKEN: Only for CI/CD when project is already linked
#   * Limited to specific project
#   * Cannot run CLI commands like 'railway whoami'
#   * Create at: https://railway.app/project/[PROJECT_ID]/settings/tokens
#
# How to Fix "Unauthorized" Errors:
# 1. Go to https://railway.app/account/tokens
# 2. Click "Create Token"
# 3. Give it a name (e.g., "CLI Access")
# 4. DO NOT select a project (leave it account-wide)
# 5. Copy the token and add to .env.local as RAILWAY_API_TOKEN=your-token
#
# See: tools/scripts/RAILWAY-AUTH-README.md for full documentation
##############################################################################

echo "🚂 TutorWise Railway Deployment"
echo "==============================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Run tools/integrations/setup-integrations.sh first"
    exit 1
fi

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📍 Project: $(pwd)"
echo "🔍 Railway CLI: $(railway --version)"

# Load Railway API token from .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    if grep -q "RAILWAY_API_TOKEN" "$PROJECT_ROOT/.env.local"; then
        export $(grep "^RAILWAY_API_TOKEN=" "$PROJECT_ROOT/.env.local" | xargs)
        echo "🔑 Railway API token loaded from .env.local"
    fi
fi

# Check if user is logged in (either via token or interactive login)
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway."
    echo ""
    echo "🔐 Authentication Required:"
    echo "   You need an ACCOUNT TOKEN (not a Project Token) for CLI access."
    echo ""
    echo "   Option 1: Use Account Token (Recommended)"
    echo "   -----------------------------------------"
    echo "   1. Go to: https://railway.app/account/tokens"
    echo "   2. Click 'Create Token'"
    echo "   3. Name it (e.g., 'CLI Access')"
    echo "   4. DO NOT select a project (leave account-wide)"
    echo "   5. Copy token and add to .env.local:"
    echo "      RAILWAY_API_TOKEN=your-account-token"
    echo ""
    echo "   Option 2: Interactive Login"
    echo "   ---------------------------"
    echo "   Run: railway login"
    echo ""
    echo "   ⚠️  Note: Project Tokens won't work for CLI commands!"
    echo ""
    exit 1
fi

echo "👤 User: $(railway whoami)"

# Check if project is linked
if ! railway status &> /dev/null; then
    echo "❓ No Railway project linked. Available options:"
    echo "   1. Link existing project: railway link [PROJECT_ID]"
    echo "   2. Create new project: railway init"
    railway list
    exit 1
fi

echo ""
echo "📊 Current status:"
railway status

echo ""
echo "🚀 Deploying to Railway..."

# Deploy the web app from apps/web directory
cd apps/web
railway up

echo ""
echo "✅ Railway deployment complete!"
echo "🔗 Use 'railway open' to view your deployment"