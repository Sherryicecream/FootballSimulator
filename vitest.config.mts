import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'domain',
          environment: 'node',
          include: ['packages/*/tests/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          globals: true,
          include: ['apps/web/tests/**/*.test.{ts,tsx}'],
          exclude: ['apps/web/tests/e2e/**'],
          setupFiles: ['apps/web/tests/setup.ts'],
        },
      },
    ],
  },
});
