import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { HomePage } from './pages/Home'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useApiError } from './hooks/useApiError'
import { useSettingsWebSocket } from './hooks/useSettingsWebSocket'
import { Loader2 } from 'lucide-react'

// 懒加载不常用页面，减少首屏加载体积
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/Register').then(m => ({ default: m.RegisterPage })))
const AdminPage = lazy(() => import('./pages/Admin').then(m => ({ default: m.AdminPage })))
const NotFoundPage = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFoundPage })))

// 页面加载中的占位组件
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
    </div>
  )
}

export default function App() {
  // 初始化全局 API 错误处理
  useApiError()
  
  // 初始化设置 WebSocket 实时同步
  useSettingsWebSocket()
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 管理员后台：独立页面，使用侧边栏布局 */}
            <Route path="/admin" element={<AdminPage />} />

            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
