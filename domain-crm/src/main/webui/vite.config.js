import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    federation({
      name: 'crmApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Routes': './src/Routes.jsx',
      },
      remotes: {
        // build: portal serves its remoteEntry at /assets/remoteEntry.js (same origin)
        // serve: portal Vite dev server at localhost:3000
        portal: command === 'serve'
          ? 'http://localhost:3000/assets/remoteEntry.js'
          : '/assets/remoteEntry.js',
      },
      shared: {
        react:              { singleton: true },
        'react-dom':        { singleton: true },
        'react-router-dom': { singleton: true },
      },
    }),
  ],
  server: {
    port: 3001,
    cors: true,
    proxy: {
      '/api': 'http://localhost:8081',
      '/q':   'http://localhost:8081',
    },
  },
  preview: { port: 3001, host: true, cors: true },
  build: { outDir: 'dist', target: 'esnext', minify: false },
}));
