// Vite derleme ve Vitest test yapılandırması.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
