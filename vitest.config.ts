import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': dirname(fileURLToPath(import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/helpers/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DATABASE_URL: 'file:./test.db',
      SESSION_SECRET: 'test-session-secret-at-least-32-characters',
      BCRYPT_ROUNDS: '4',
    },
  },
});
