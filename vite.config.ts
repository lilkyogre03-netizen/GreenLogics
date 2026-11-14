import { defineConfig } from 'vitest/config';

// Konfigurasi Vite dan Vitest disatukan agar satu sumber konfigurasi build & test
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
