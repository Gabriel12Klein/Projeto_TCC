import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['backend/src/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
