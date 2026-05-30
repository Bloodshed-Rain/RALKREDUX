// Pin the test timezone so date/timestamp formatting is deterministic across
// dev machines and CI (formatTimestampDate renders timestamp-bearing values in
// the ambient zone; without this the signed_at/exported_at columns would shift
// by machine locale). Must be set before any Date is constructed.
process.env.TZ = 'UTC';

module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/setup.ts'],
};
