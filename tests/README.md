# Tests Directory

This directory contains all test files, test results, and testing artifacts for the Tutorwise monorepo.

## Structure

```
tests/
├── unit/                    # Unit tests
├── integration/             # Integration tests
├── e2e/                    # End-to-end tests (Playwright)
├── test-results/           # Test artifacts and results
└── README.md              # This file
```

## Running Tests

```bash
npm run test              # Run unit tests
npm run test:e2e          # Run E2E tests
npm run test:visual       # Run visual tests
```
