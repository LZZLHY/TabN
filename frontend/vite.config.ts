import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tabn.png', 'vite.svg', 'changelog.json'],
      manifest: {
        name: 'TabN',
        short_name: 'TabN',
        description: '现代化浏览器起始页 - 书签管理、快捷搜索、个性化设置',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/tabn.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['productivity', 'utilities'],
        lang: 'zh-CN',
      },
      workbox: {
        // 预缓存所有静态资源
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // 运行时缓存策略
        runtimeCaching: [
          {
            // 缓存 Bing 壁纸
            urlPattern: /^https:\/\/cn\.bing\.com\/th\?id=/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bing-wallpaper-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 缓存 Picsum 壁纸
            urlPattern: /^https:\/\/picsum\.photos\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'picsum-wallpaper-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 缓存 fastly.picsum.photos 实际图片
            urlPattern: /^https:\/\/fastly\.picsum\.photos\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'picsum-wallpaper-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 缓存其他外部图片（自定义壁纸、API 壁纸）
            urlPattern: /\.(jpg|jpeg|png|gif|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 缓存 Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    // 关键：强制所有依赖共享同一个 React 实例，避免 hooks dispatcher 为 null 导致白屏
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    host: '0.0.0.0',  // 允许外部 IP 访问
    port: 5173,
    allowedHosts: true,  // 允许所有域名访问
  },
  build: {
    rollupOptions: {
      output: {
        // 代码分割：将大型第三方库分离到独立 chunk
        manualChunks: {
          // React 核心库
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 拼音库（约 200KB）
          'vendor-pinyin': ['pinyin-pro'],
          // 图标库（约 150KB）
          'vendor-icons': ['lucide-react'],
          // 状态管理和工具库
          'vendor-utils': ['zustand', 'clsx', 'tailwind-merge', 'sonner'],
        },
      },
    },
    // 提高警告阈值，避免分割后仍然警告
    chunkSizeWarningLimit: 600,
  },
})
