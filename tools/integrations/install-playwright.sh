#!/bin/bash
set -e

echo "Installing Playwright CLI..."

# Navigate to web app directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT/apps/web"

# Check if Playwright is already installed
if npx playwright --version &> /dev/null; then
    echo "Playwright already installed: $(npx playwright --version)"
else
    echo "Playwright not found in project dependencies"
    exit 1
fi

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install

# Verify installation
if npx playwright --version &> /dev/null; then
    echo "Playwright setup complete: $(npx playwright --version)"
    echo "Browsers installed successfully"
    echo "Use 'npm run test:e2e' to run end-to-end tests"
    echo "Use 'npm run test:e2e:ui' for interactive UI mode"
else
    echo "Playwright setup failed"
    exit 1
fi