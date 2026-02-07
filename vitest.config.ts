import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  resolve: {
    alias: [
      {
        find: '@prisma/generated/browser',
        replacement: path.resolve(
          __dirname,
          './prisma/generated/prisma/browser',
        ),
      },
      {
        find: '@prisma/generated',
        replacement: path.resolve(
          __dirname,
          './prisma/generated/prisma/client',
        ),
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
})
