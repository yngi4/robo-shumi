import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      base: './', 
      
      // --- НАЧАЛО ВАЖНОГО ИЗМЕНЕНИЯ ---
      build: {
        target: 'es2020', // Это ключевая настройка для работы на телефонах
        outDir: 'dist',
        assetsDir: 'assets',
        // Уменьшает размер кода, чтобы быстрее грузилось
        minify: 'esbuild', 
      },
      // --- КОНЕЦ ВАЖНОГО ИЗМЕНЕНИЯ ---

      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
