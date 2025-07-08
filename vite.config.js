import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量  
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    server: {
      port: 3001, // 设置启动端口为3001，避免与其他服务冲突
      host: '0.0.0.0', // 允许任意地址访问
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          rewrite: (path) => {
            console.log('Original path:', path);
            const newPath = path.replace(/^\/api/, '');
            console.log('Rewritten path:', newPath);
            return newPath;
          },
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    define: {
      // 将环境变量暴露给前端代码
      'import.meta.env.VITE_SSE_URL': JSON.stringify(env.VITE_SSE_URL || 'http://localhost:8080/events'),
      // 修复 process 未定义的问题
      global: 'globalThis',
    }
  }
})