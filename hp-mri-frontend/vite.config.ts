import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API_PROXY_TARGET=https://api-dev.medcap.ai npm run dev  -> the dev ECS stack
const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:5001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Configuration for the development server (npm run dev)
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Configuration for the preview server (npm run preview)
  // This serves the production build locally to test it
  preview: {
    port: 3000,
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  define: {
    global: 'globalThis',
  },

  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    },
  },
});