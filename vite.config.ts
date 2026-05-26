import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Manual chunk splitting so heavy libraries don't bloat the main bundle.
    // Each entry below becomes a separate JS file that the browser caches
    // independently and only downloads on routes that actually need it.
    rollupOptions: {
      output: {
        manualChunks: {
          // Charting (Recharts is heavy and only used on dashboard pages).
          'vendor-charts': ['recharts'],
          // Drag-and-drop libraries used in kanban/board views.
          'vendor-dnd': ['@hello-pangea/dnd'],
          // ARCA cryptography (node-forge + xml2js).
          'vendor-arca': ['node-forge', 'xml2js'],
          // QR code utilities used in client portal / share links.
          'vendor-qr': ['qrcode.react', 'react-qr-code'],
          // React + router stay together as a single 'vendor-react'.
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Bumping the warning threshold from the default 500 KB. We still want
    // the warning to fire but the React + Supabase combo legitimately runs
    // a bit above 500 KB even after splitting.
    chunkSizeWarningLimit: 800,
  },
})
