import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    new MonacoWebpackPlugin({
      languages: ['javascript', 'python', 'java']
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
