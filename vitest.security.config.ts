import { defineConfig } from 'vitest/config';
import path from 'path';

// Dedicated config for security tests - runs against actual Supabase
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node environment for DB tests
    include: ['src/__tests__/security/**/*.{test,spec}.ts'],
    testTimeout: 30000, // Longer timeout for DB operations
    hookTimeout: 60000,
    pool: 'forks', // Use forks for isolation
    poolOptions: {
      forks: {
        singleFork: true, // Run serially to avoid test interference
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
