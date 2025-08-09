import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// command: 'serve' or 'build' based on npm run command
// mode: 'development' or 'production' based on npm 
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [react()],
    // redirect any /api requests to API_URL specified in .env.development
    server: mode === 'development' ? {
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false
          }
        }
      }
      : undefined, // in production, use reverse proxy ALB
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        './runtimeConfig': './runtimeConfig.browser',
      },
    },
  }
});
