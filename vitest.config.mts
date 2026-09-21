import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'balance',
          environment: 'node',
          include: ['tools/balance/tests/**/*.test.ts'],
          // Balance files launch their own bounded workers; keep full-suite CPU deterministic.
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'domain',
          environment: 'node',
          include: ['packages/*/tests/**/*.test.ts'],
          exclude: [
            'packages/application/tests/**/*.test.ts',
            'packages/content/tests/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'content',
          environment: 'node',
          include: ['packages/content/tests/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'application',
          environment: 'node',
          include: ['packages/application/tests/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'local-ai',
          environment: 'node',
          include: ['apps/local-ai/tests/**/*.test.ts'],
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
