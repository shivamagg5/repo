const path = require('path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@platform/types$': path.resolve(__dirname, '../../packages/types/dist/index.js'),
    '^@platform/validation$': path.resolve(__dirname, '../../packages/validation/dist/index.js'),
    '^@platform/config$': path.resolve(__dirname, '../../packages/config/dist/index.js'),
  },
};
