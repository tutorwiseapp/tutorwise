#!/bin/bash
set -e

echo "TutorWise End-to-End Testing"
echo "============================"

# Navigate to web app directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT/apps/web"

echo "Project: $(pwd)"

# Check if Playwright is available
if ! npx playwright --version &> /dev/null; then
    echo "Playwright not found. Run tools/integrations/install-playwright.sh first"
    exit 1
fi

echo "Playwright: $(npx playwright --version)"

# Check if browsers are installed
if ! npx playwright install --dry-run &> /dev/null; then
    echo "Installing Playwright browsers..."
    npx playwright install
fi

echo ""
echo "Running end-to-end tests..."

# Parse command line arguments
case "${1:-default}" in
    "ui")
        echo "Starting Playwright UI mode..."
        npx playwright test --ui
        ;;
    "headed")
        echo "Running tests in headed mode..."
        npx playwright test --headed
        ;;
    "debug")
        echo "Running tests in debug mode..."
        npx playwright test --debug
        ;;
    "report")
        echo "Opening test report..."
        npx playwright show-report
        ;;
    *)
        echo "Running headless tests..."
        npx playwright test
        ;;
esac

echo ""
echo "E2E testing complete!"
echo ""
echo "Available options:"
echo "  ./test-e2e.sh ui      - Interactive UI mode"
echo "  ./test-e2e.sh headed  - Headed browser mode"
echo "  ./test-e2e.sh debug   - Debug mode"
echo "  ./test-e2e.sh report  - View test report"