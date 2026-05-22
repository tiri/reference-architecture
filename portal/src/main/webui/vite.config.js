import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'portal',
      // Expose shared UI components so domain apps can import them.
      // Domain apps reference this at /assets/remoteEntry.js (portal's own origin).
      filename: 'remoteEntry.js',
      exposes: {
        './UI': './src/components/ui/index.js',
      },
      remotes: {
        // DomainProxy: /assets/{domain}/{path} → http://domain:port/{path}
        // Vite builds remoteEntry.js into assets/ subfolder, so the path is:
        crmApp:     '/assets/crm/assets/remoteEntry.js',
        billingApp: '/assets/billing/assets/remoteEntry.js',
      },
      shared: {
        react:              { singleton: true },
        'react-dom':        { singleton: true },
        'react-router-dom': { singleton: true },
      },
    }),
  ],

  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/api':    'http://localhost:8080',
      '/q':      'http://localhost:8080',
      '/logout': 'http://localhost:8080',
      '/assets/crm':     { target: 'http://localhost:3001', changeOrigin: true, rewrite: p => p.replace(/^\/assets\/crm/, '') },
      '/assets/billing': { target: 'http://localhost:3002', changeOrigin: true, rewrite: p => p.replace(/^\/assets\/billing/, '') },
    },
  },

  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: false,
  },
});
