// cas/packages/core/jest.config.js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  // Point to the root babel.config.js
  transformIgnorePatterns: ['/node_modules/'],
  // verbose: true,
};
