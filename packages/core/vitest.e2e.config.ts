import {defineConfig} from 'vitest/config';

// Browser tests against built example explainers. Need Playwright's Chromium.
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.test.ts'],
    fileParallelism: false,
  },
});
