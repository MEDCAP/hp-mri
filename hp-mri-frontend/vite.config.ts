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
            target: env.VITE_API_URL,
            changeOrigin: true,
            secure: false
          }
        }
      }
      : undefined // in production, use reverse proxy ALB
  }
});
