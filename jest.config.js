const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './apps/web',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tutorwise-railway-backend/',
    '<rootDir>/tests/e2e/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
  },
  collectCoverageFrom: [
    'apps/web/src/**/*.{js,jsx,ts,tsx}',
    '!apps/web/src/**/*.d.ts',
    '!apps/web/src/**/_*.{js,jsx,ts,tsx}',
    '!apps/web/src/**/layout.tsx',
    '!apps/web/src/**/page.tsx',
    '!apps/web/src/**/loading.tsx',
    '!apps/web/src/**/error.tsx',
    '!apps/web/src/**/not-found.tsx',
    '!apps/web/src/app/globals.css',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  collectCoverage: false, // Enable with --coverage flag
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/unit/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.{js,jsx,ts,tsx}',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testTimeout: 10000,
  maxWorkers: 1, // Run tests serially to prevent worker crashes
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)