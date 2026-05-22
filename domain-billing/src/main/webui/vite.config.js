import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    federation({
      name: 'billingApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Routes': './src/Routes.jsx',
      },
      remotes: {
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
    port: 3002,
    cors: true,
    proxy: {
      '/api': 'http://localhost:8082',
      '/q':   'http://localhost:8082',
    },
  },
  preview: { port: 3002, host: true, cors: true },
  build: { outDir: 'dist', target: 'esnext', minify: false },
}));
