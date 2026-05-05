import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/etf': { target: 'http://localhost:8000', changeOrigin: true },
      '/simulation': { target: 'http://localhost:8000', changeOrigin: true },
      '/regression': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
