/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/src/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^(.+)\\.js$": "$1"
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: false, // Do not treat files as ESM
        tsconfig: "tsconfig.cjs.json", // Path to your TypeScript config for CJS
      },
    ],
  },
}; 