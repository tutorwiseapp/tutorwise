module.exports = {
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['next/babel', {
          'preset-typescript': {
            allowDeclareFields: true
          }
        }]
      ]
    }],
  },
  testTimeout: 90000, // Set Jest test timeout to 90 seconds
  // Add globals to support TypeScript type assertions
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
