import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LoggingErrorBoundary } from './components/LoggingErrorBoundary'
import { initLogger, setupGlobalErrorHandlers } from './services/logger'

// 初始化日志服务
initLogger()
setupGlobalErrorHandlers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoggingErrorBoundary>
      <App />
    </LoggingErrorBoundary>
  </StrictMode>,
)
