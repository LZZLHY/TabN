import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // 关键：强制所有依赖共享同一个 React 实例，避免 hooks dispatcher 为 null 导致白屏
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    host: '0.0.0.0',  // 允许外部 IP 访问
    port: 5173,
  },
})
