const ESM_DEPS_TO_TRANSFORM = '@naviprotocol|@mysten|@alphafi|@cetusprotocol|@pythnetwork';

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  passWithNoTests: true,
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.esm.json',
      },
    ],
    [`node_modules/(${ESM_DEPS_TO_TRANSFORM})/.+\\.(js|mjs)$`]: [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.esm.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [`/node_modules/(?!(${ESM_DEPS_TO_TRANSFORM})/)`],
};
