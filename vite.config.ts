import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// BASE_PATH lets the same build serve from a sub-path (e.g. GitHub Pages: /sri-lanka-history-atlas/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // split long-lived vendor code and the dataset so they cache independently
        manualChunks(id: string) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) return 'leaflet'
          if (id.includes('node_modules/react')) return 'react'
          if (id.includes('/src/data/')) return 'data'
        },
      },
    },
  },
})
