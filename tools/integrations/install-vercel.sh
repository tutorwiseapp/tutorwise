#!/bin/bash
set -e

echo "▲ Installing Vercel CLI..."

# Check if Vercel CLI is already installed
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI already installed: $(vercel --version)"
    exit 0
fi

# Install Vercel CLI globally
echo "📦 Installing vercel globally..."
npm install -g vercel

# Verify installation
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI installed successfully: $(vercel --version)"
    echo "🔗 Use 'vercel login' to authenticate"
else
    echo "❌ Vercel CLI installation failed"
    exit 1
fi