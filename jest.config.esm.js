export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'], // Treat TypeScript files as ESM
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true, // ts-jest ESM support
        tsconfig: 'tsconfig.esm.json', // Path to your TypeScript config for ESM
      },
    ],
  },
};
