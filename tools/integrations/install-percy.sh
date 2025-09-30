#!/bin/bash
set -e

echo "Installing Percy CLI..."

# Check if Percy CLI is already installed globally
if command -v percy &> /dev/null; then
    echo "Percy CLI already installed globally: $(percy --version)"
    exit 0
fi

# Install Percy CLI globally
echo "Installing @percy/cli globally..."
npm install -g @percy/cli

# Navigate to web app directory to check local Percy setup
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT/apps/web"

# Check if Percy is in local dependencies
if npm list @percy/playwright &> /dev/null || npm list @percy/cli &> /dev/null; then
    echo "Percy packages found in project dependencies"
else
    echo "Installing Percy Playwright integration..."
    npm install --save-dev @percy/cli @percy/playwright
fi

# Verify installation
if command -v percy &> /dev/null; then
    echo "Percy CLI installed successfully: $(percy --version)"
    echo "Configure PERCY_TOKEN environment variable"
    echo "Use 'percy exec -- playwright test' to run visual tests"
else
    echo "Percy CLI installation failed"
    exit 1
fi