import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import obfuscator from 'vite-plugin-javascript-obfuscator';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [
    react(),
    isProduction &&
      obfuscator({
        include: ['src/**/*.tsx', 'src/**/*.ts'],
        exclude: ['node_modules/**/*'],
        apply: 'build',
        obfuscatorOptions: {
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,

          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,

          identifierNamesGenerator: 'hexadecimal',

          disableConsoleOutput: true,

          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,

          selfDefending: true,

          debugProtection: true,
          debugProtectionInterval: 2000,

          simplify: true,

          numbersToExpressions: true,

          renameGlobals: false,

          reservedNames: ['^__vite', '^react', '^React'],

          transformObjectKeys: true,
        },
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: isProduction ? 'terser' : false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'file-preview': path.resolve(__dirname, 'file-preview.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
