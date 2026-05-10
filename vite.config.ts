import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import obfuscator from 'vite-plugin-javascript-obfuscator';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  publicDir: 'public',
  plugins: [
    react(),
    // 代码混淆（仅生产环境）
    isProduction &&
      obfuscator({
        include: ['src/**/*.tsx', 'src/**/*.ts', 'electron/**/*.ts'],
        exclude: ['node_modules/**/*'],
        apply: 'build',
        obfuscatorOptions: {
          // 控制流扁平化（增加反编译难度）
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,

          // 死代码注入（增加体积，提高混淆度）
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,

          // 标识符混淆
          identifierNamesGenerator: 'hexadecimal',

          // 禁用 console 和 debugger
          disableConsoleOutput: true,

          // 字符串加密
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,

          // 域锁定（可选：限制特定域名运行）
          // domainLock: ['localhost'],

          // 自防御（检测代码是否被修改）
          selfDefending: true,

          // 调试保护
          debugProtection: true,
          debugProtectionInterval: 2000,

          // 简化优化
          simplify: true,

          // 数字转表达式
          numbersToExpressions: true,

          // 重命名全局变量（慎用，可能影响依赖）
          renameGlobals: false,

          // 保留特定名称（防止依赖出问题）
          reservedNames: ['^__vite', '^__electron', '^react', '^React'],

          // 转换模式
          transformObjectKeys: true,
        },
      }),
    electron([
      {
        // Main process
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
vite: {
            build: {
              sourcemap: false, // 生产环境禁用 sourcemap
              minify: isProduction ? 'terser' : false,
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron', 'better-sqlite3', 'keytar', 'node-pty'],
              },
            },
          },
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            sourcemap: false, // 生产环境禁用 sourcemap
            minify: isProduction ? 'terser' : false,
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
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
