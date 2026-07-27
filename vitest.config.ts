import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/storage/adapters/mysql.adapter.ts',
                'src/storage/adapters/cosmos.adapter.ts', 'src/storage/adapters/dynamo.adapter.ts'],
    },
  },
});
