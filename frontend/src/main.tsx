import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LoggingErrorBoundary } from './components/LoggingErrorBoundary'
import { initLogger, setupGlobalErrorHandlers } from './services/logger'

// 初始化日志服务
initLogger()
setupGlobalErrorHandlers()

// 控制台欢迎语句
const version = __APP_VERSION__
const asciiArt = `
 _____     _     _   _ 
|_   _|_ _| |__ | \\ | |
  | |/ _\` | '_ \\|  \\| |
  | | (_| | |_) | |\\  |
  |_|\\__,_|_.__/|_| \\_|
`
console.log(
  `%cTabN%c Version ${version}\n%c欢迎使用 TabN 新标签页！`,
  'color: #10b981; font-size: 16px; font-weight: bold;',
  'color: #6b7280; font-size: 12px;',
  'color: #3b82f6; font-size: 12px;'
)
console.log(`%c${asciiArt}`, 'color: #10b981; font-family: monospace; font-size: 12px;')
console.log(
  '%c© 2025-2026 lovedhy. All Rights Reserved.',
  'color: #6b7280; font-size: 11px;'
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoggingErrorBoundary>
      <App />
    </LoggingErrorBoundary>
  </StrictMode>,
)
