#!/bin/bash
set -e

echo "🚂 Installing Railway CLI..."

# Check if Railway CLI is already installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI already installed: $(railway --version)"

    # Check for Railway token in .env.local
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    if [ -f "$PROJECT_ROOT/.env.local" ] && grep -q "RAILWAY_TOKEN" "$PROJECT_ROOT/.env.local"; then
        echo "🔑 Railway token found in .env.local"
        echo "   Scripts will automatically use this token for authentication"
    else
        echo "🔗 To authenticate, either:"
        echo "   1. Add RAILWAY_TOKEN to .env.local (recommended for automation), or"
        echo "   2. Run 'railway login' for interactive authentication"
    fi
    exit 0
fi

# Install Railway CLI globally
echo "📦 Installing @railway/cli globally..."
npm install -g @railway/cli

# Verify installation
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI installed successfully: $(railway --version)"

    # Check for Railway token in .env.local
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    if [ -f "$PROJECT_ROOT/.env.local" ] && grep -q "RAILWAY_TOKEN" "$PROJECT_ROOT/.env.local"; then
        echo "🔑 Railway token found in .env.local"
        echo "   Scripts will automatically use this token for authentication"
    else
        echo "🔗 To authenticate, either:"
        echo "   1. Add RAILWAY_TOKEN to .env.local (recommended for automation), or"
        echo "   2. Run 'railway login' for interactive authentication"
    fi
else
    echo "❌ Railway CLI installation failed"
    exit 1
fi