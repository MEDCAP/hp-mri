import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// command: 'serve' or 'build' based on npm run command
// mode: 'development' or 'production' based on npm 
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // redirect any /api requests to API_URL specified in .env.development
    server: mode === 'development' ? {
        proxy: {
          '/api': {
            target: 'http://localhost:5177',
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


// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// // command: 'serve' or 'build' based on npm run command
// // mode: 'development' or 'production' based on npm 
// export default defineConfig(({ mode }) => {
//   return {
//     plugins: [react()],
    
//     // Define global variables for Node.js compatibility
//     define: {
//       global: 'globalThis',
//     },
    
//     // Optimize dependencies for faster dev server
//     optimizeDeps: {
//       include: [
//         'react', 
//         'react-dom', 
//         '@mui/material',
//         '@mui/icons-material',
//         'plotly.js',
//         'react-plotly.js',
//         'amazon-cognito-identity-js'
//       ],
//       // Force pre-bundling of large dependencies
//       force: mode === 'development'
//     },
    
//     // Development server optimizations
//     server: mode === 'development' ? {
//       proxy: {
//         '/api': {
//           target: 'http://localhost:5177',
//           changeOrigin: true,
//           secure: false
//         }
//       },
//       // Enable faster HMR
//       hmr: {
//         overlay: false
//       },
//       // Increase fs cache
//       fs: {
//         strict: false
//       }
//     } : undefined,
    
//     // Build optimizations
//     build: {
//       // Enable code splitting
//       rollupOptions: {
//         output: {
//           manualChunks: {
//             vendor: ['react', 'react-dom'],
//             mui: ['@mui/material', '@mui/icons-material'],
//             plotly: ['plotly.js', 'react-plotly.js']
//           }
//         }
//       },
//       // Increase chunk size warning limit
//       chunkSizeWarningLimit: 1000
//     }
//   }
// });
