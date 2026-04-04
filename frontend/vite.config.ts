// Vite build configuration for the NeverLate frontend.
// Sets up the React plugin and proxies all /api requests to the Spring Boot backend
// running on port 8080, so the frontend dev server can talk to the backend without CORS issues.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
