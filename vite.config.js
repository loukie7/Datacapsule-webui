import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [react()],
    server: {
      port: 3000, // 设置启动端口为3000
      host: '0.0.0.0', // 允许任意地址访问
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost',
          changeOrigin: true,
          rewrite: (path) => {
            console.log('Rewriting path:', path);
            // return path;
            return path.replace(/^\/api/, '');
          }
        }
      }
    },
    define: {
      // 将环境变量暴露给前端代码
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || 'ws://localhost/ws')
    }
  }
})