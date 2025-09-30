# Percy Visual Testing Setup

Percy visual testing configuration for the Tutorwise platform. This provides automated visual regression testing using Percy in conjunction with Playwright end-to-end tests.

## Overview

Percy provides automated visual testing by capturing screenshots during test runs and comparing them to baseline images to detect visual regressions. This ensures that UI changes don't introduce unintended visual bugs.

## Prerequisites

- Percy account and project setup
- Playwright installed and configured
- Percy CLI installed globally or in the project

## Installation

Use the integration management system:

```bash
# Install Percy CLI
tools/integrations/install-percy.sh

# Or via npm
cd tools && npm run install:percy
```

## Configuration

Percy integrates with Playwright tests via environment variables:

```bash
# Required environment variable
export PERCY_TOKEN=your_percy_token_here
```

## Usage

```bash
# Run visual tests with Percy
tools/scripts/percy-test-visual.sh

# Or via npm
cd tools && npm run test:visual

# Upload to Percy
npm run test:visual:upload
```

## Integration with CI/CD

Percy works seamlessly with deployment pipelines:

1. Tests run automatically on pull requests
2. Visual diffs are generated and reviewed
3. Approved changes update baselines
4. Failed visual tests block deployment

## Related Files

- `tools/integrations/install-percy.sh` - Percy CLI installation
- `tools/scripts/percy-test-visual.sh` - Visual testing script
- `tools/package.json` - npm scripts configuration
- `tools/integration-status.json` - Integration tracking