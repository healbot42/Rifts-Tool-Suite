import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/Rifts-Tool-Suite/',
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.js'],
  },
})
