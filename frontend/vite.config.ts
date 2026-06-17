import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` est paramétrable pour GitHub Pages (projet servi sous /<repo>/).
// Le workflow Pages définit VITE_BASE=/Financial_dashboard/ ; en local il reste '/'.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
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
