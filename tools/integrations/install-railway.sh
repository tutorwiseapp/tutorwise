#!/bin/bash
set -e

echo "🚂 Installing Railway CLI..."

# Check if Railway CLI is already installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI already installed: $(railway --version)"
    exit 0
fi

# Install Railway CLI globally
echo "📦 Installing @railway/cli globally..."
npm install -g @railway/cli

# Verify installation
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI installed successfully: $(railway --version)"
    echo "🔗 Use 'railway login' to authenticate"
else
    echo "❌ Railway CLI installation failed"
    exit 1
fi