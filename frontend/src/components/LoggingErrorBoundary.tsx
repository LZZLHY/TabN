/**
 * 增强的 ErrorBoundary 组件
 * Requirements: 6.2
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logComponentError } from '../services/logger'
import { getUpdateState } from '../stores/updateState'

interface Props {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
}

interface State {
  hasError: boolean
  error: Error | null
}

export class LoggingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录组件错误到日志服务
    logComponentError(error, errorInfo.componentStack || '', {
      errorBoundary: true,
    })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 如果正在更新中，显示更新提示而不是错误页面
      const updateState = getUpdateState()
      if (updateState.isUpdating) {
        return (
          <div className="min-h-screen w-full flex items-center justify-center bg-black/90 text-white">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <div className="text-xl font-semibold">{updateState.message}</div>
              <div className="text-sm opacity-60">页面将在更新完成后自动刷新...</div>
            </div>
          </div>
        )
      }

      // 自定义 fallback
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误界面
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="text-red-500 text-xl mb-4">出错了</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {this.state.error.message || '发生了未知错误'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default LoggingErrorBoundary
