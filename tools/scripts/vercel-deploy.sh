#!/bin/bash
set -e

echo "▲ TutorWise Vercel Deployment"
echo "============================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Run tools/integrations/setup-integrations.sh first"
    exit 1
fi

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📍 Project: $(pwd)"
echo "🔍 Vercel CLI: $(vercel --version)"

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Run 'vercel login' first"
    exit 1
fi

echo "👤 User: $(vercel whoami)"

echo ""
echo "🏗️ Building project..."
cd apps/web && npm run build

echo ""
echo "🚀 Deploying to Vercel..."

# Deploy to production
vercel --prod

echo ""
echo "✅ Vercel deployment complete!"
echo "🔗 Check deployment status: vercel ls"