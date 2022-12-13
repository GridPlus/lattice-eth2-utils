import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
  return {
    test: {
      coverage: {
        reporter: ['lcov'],
      },
      update: false,
      reporters: ['default'],
      globals: true,
      testTimeout: 120000,
      threads: false,
      setupFiles: ['./src/__test__/setup.ts'],
    },
  }
});
