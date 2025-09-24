/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@cetusprotocol|bn\\.js)/)'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false, // Do not treat files as ESM
        tsconfig: 'tsconfig.cjs.json', // Path to your TypeScript config for CJS
      },
    ],
  },
};
