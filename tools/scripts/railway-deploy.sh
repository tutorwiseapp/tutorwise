#!/bin/bash
set -e

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

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Run 'railway login' first"
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