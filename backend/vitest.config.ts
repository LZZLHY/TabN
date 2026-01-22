import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/tests/integration/**',
      'src/controllers/adminController.test.ts',
      'src/services/clickStats.test.ts',
      'node_modules'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
})
