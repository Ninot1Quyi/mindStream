import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

// 声明 __dirname 以解决 TypeScript 错误
const __dirname = process.cwd();

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'public'),
    build: {
      outDir: 'dist/renderer',
    },
    // 开发服务器配置
    server: {
      port: 5173,
      strictPort: true,
    },
    // 添加插件以增强调试能力
    plugins: [
      {
        name: 'development-error-logger',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            console.log(`[电子渲染] 请求: ${req.url}`);
            next();
          });
        },
      }
    ],
    // 添加全局变量
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.VITE_DEV_SERVER_HOST': JSON.stringify('localhost'),
      'process.env.VITE_DEV_SERVER_PORT': JSON.stringify('5173'),
    },
    // 改进解析配置
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src/renderer'),
      },
    },
  },
}); 