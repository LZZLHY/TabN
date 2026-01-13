import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { HomePage } from './pages/Home'
import { LoginPage } from './pages/Login'
import { NotFoundPage } from './pages/NotFound'
import { RegisterPage } from './pages/Register'
import { AdminPage } from './pages/Admin'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
      </BrowserRouter>
    </ErrorBoundary>
  )
}
