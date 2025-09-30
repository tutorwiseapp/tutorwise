#!/bin/bash
set -e

echo "TutorWise Visual Testing with Percy"
echo "==================================="

# Check if Percy CLI is installed
if ! command -v percy &> /dev/null; then
    echo "Percy CLI not found. Run tools/integrations/install-percy.sh first"
    exit 1
fi

# Navigate to web app directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT/apps/web"

echo "Project: $(pwd)"
echo "Percy CLI: $(percy --version)"

# Check if PERCY_TOKEN is set
if [[ -z "${PERCY_TOKEN}" ]]; then
    echo "Warning: PERCY_TOKEN environment variable not set"
    echo "Visual comparisons will not be uploaded to Percy"
    echo "Set PERCY_TOKEN to enable full Percy functionality"
    echo ""
fi

# Check if Playwright is available
if ! npx playwright --version &> /dev/null; then
    echo "Playwright not found. Run tools/integrations/install-playwright.sh first"
    exit 1
fi

echo "Playwright: $(npx playwright --version)"

echo ""
echo "Running visual tests with Percy..."

# Run visual tests based on argument
case "${1:-default}" in
    "upload")
        if [[ -z "${PERCY_TOKEN}" ]]; then
            echo "PERCY_TOKEN required for upload mode"
            exit 1
        fi
        echo "Running tests with Percy upload..."
        percy exec -- npx playwright test
        ;;
    "local")
        echo "Running local visual tests (no Percy upload)..."
        npx playwright test
        ;;
    "debug")
        echo "Running visual tests in debug mode..."
        percy exec -- npx playwright test --debug
        ;;
    *)
        echo "Running visual tests..."
        if [[ -n "${PERCY_TOKEN}" ]]; then
            percy exec -- npx playwright test
        else
            echo "No PERCY_TOKEN found, running local tests only..."
            npx playwright test
        fi
        ;;
esac

echo ""
echo "Visual testing complete!"
echo ""
echo "Available options:"
echo "  ./test-visual.sh upload  - Upload to Percy (requires PERCY_TOKEN)"
echo "  ./test-visual.sh local   - Local tests only"
echo "  ./test-visual.sh debug   - Debug mode"