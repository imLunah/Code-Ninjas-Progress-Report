import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // shadcn's convention. Components pulled from the registry import from
      // `@/lib/utils`, so the alias has to exist for them to resolve.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Full lottie-web uses eval() (expressions support), which our CSP
      // script-src correctly blocks. The light player is eval-free; our
      // animations don't use expressions. Do NOT add 'unsafe-eval' to CSP.
      'lottie-web': 'lottie-web/build/player/lottie_light',
    },
  },
  // es2020 everywhere for the same reason as build.target below — the dev
  // server and dep prebundle pass their own targets to esbuild.
  esbuild: { target: 'es2020' },
  optimizeDeps: { esbuildOptions: { target: 'es2020' } },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    // Explicit target required: the esbuild override (0.28.x, security bumps)
    // rejects Vite 6's default browserlist+supported-overrides combo with
    // "Transforming destructuring ... is not supported yet". es2020 is the
    // floor of Vite's default list, so browser support is unchanged.
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'supabase': ['@supabase/supabase-js'],
          'emoji': ['emoji-picker-react'],
          'markdown': ['react-markdown', 'remark-gfm'],
          // Shared by the dashboard and Reports. Left in their route chunks it
          // would be downloaded twice and cached separately.
          'charts': ['recharts'],
          'csv': ['papaparse'],
          'crop': ['react-easy-crop'],
        }
      }
    }
  }
})
