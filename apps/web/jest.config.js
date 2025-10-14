// apps/web/jest.config.js
const nextJest = require('next/jest');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const createJestConfig = nextJest({
  // This is correct because it's relative to THIS file (apps/web)
  dir: './',
});

const customJestConfig = {
  // Go up two directories from apps/web to find the root setup file
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',

  // Automatically read the path aliases from your tsconfig.json
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    // The prefix should be relative to <rootDir> which is now apps/web
    prefix: '<rootDir>/',
  }),
};

module.exports = createJestConfig(customJestConfig);