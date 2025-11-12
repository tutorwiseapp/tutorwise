#!/bin/bash

# Test Payments Setup Script
# This script helps you set up local testing for Stripe payments

set -e

echo "🔧 Stripe Payment Testing Setup"
echo "================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed"
    echo ""
    echo "Please install Stripe CLI:"
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew install stripe/stripe-cli/stripe"
    echo ""
    echo "macOS (Manual):"
    echo "  curl -L https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_darwin_arm64.tar.gz | tar xz"
    echo "  sudo mv stripe /usr/local/bin/"
    echo ""
    echo "Linux:"
    echo "  wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz"
    echo "  tar -xvf stripe_1.19.4_linux_x86_64.tar.gz"
    echo "  sudo mv stripe /usr/local/bin/"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI found: $(stripe --version)"
echo ""

# Check if authenticated
if ! stripe config --list &> /dev/null; then
    echo "⚠️  Not authenticated with Stripe"
    echo ""
    echo "Please authenticate:"
    echo "  stripe login"
    echo ""
    exit 1
fi

echo "✅ Authenticated with Stripe"
echo ""

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found"
    echo ""
    echo "Please create .env.local with:"
    echo "  STRIPE_SECRET_KEY=sk_test_..."
    echo "  STRIPE_PUBLISHABLE_KEY=pk_test_..."
    echo "  STRIPE_WEBHOOK_SECRET=whsec_..."
    echo ""
    exit 1
fi

# Check for required env vars
if ! grep -q "STRIPE_SECRET_KEY" .env.local; then
    echo "⚠️  STRIPE_SECRET_KEY not found in .env.local"
fi

if ! grep -q "STRIPE_PUBLISHABLE_KEY" .env.local; then
    echo "⚠️  STRIPE_PUBLISHABLE_KEY not found in .env.local"
fi

if ! grep -q "STRIPE_WEBHOOK_SECRET" .env.local; then
    echo "⚠️  STRIPE_WEBHOOK_SECRET not found in .env.local"
    echo ""
    echo "To get your webhook secret, run:"
    echo "  stripe listen --forward-to localhost:3000/api/webhooks/stripe"
    echo ""
    echo "Then copy the 'whsec_...' value to .env.local"
fi

echo ""
echo "📋 Setup Checklist:"
echo ""
echo "1. ✅ Stripe CLI installed"
echo "2. ✅ Authenticated with Stripe"
echo "3. Check .env.local has all required keys"
echo "4. Start dev server: npm run dev"
echo "5. Forward webhooks: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo "6. Test withdrawal flow in app"
echo ""
echo "📖 Full testing guide: TESTING_PAYMENTS.md"
echo ""
