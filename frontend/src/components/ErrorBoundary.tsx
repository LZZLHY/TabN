import React from 'react'
import { getUpdateState } from '../stores/updateState'

type Props = {
  children: React.ReactNode
}

type State =
  | { hasError: false }
  | { hasError: true; message: string; stack?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(err: unknown): State {
    const e = err instanceof Error ? err : new Error(String(err))
    return { hasError: true, message: e.message, stack: e.stack }
  }

  componentDidCatch(err: unknown) {
    // Keep a console trace for debugging in dev
    console.error('ErrorBoundary caught:', err)
  }

  render() {
    if (!this.state.hasError) return this.props.children

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

    return (
      <div className="min-h-screen w-full p-6 flex items-start justify-center bg-black text-white">
        <div className="w-full max-w-3xl space-y-3">
          <div className="text-lg font-semibold">页面发生错误（已捕获）</div>
          <div className="text-sm opacity-90">
            请把下面的错误信息发我，我可以据此精确修复白屏根因。
          </div>
          <pre className="text-xs whitespace-pre-wrap break-words rounded-xl bg-white/10 p-4 border border-white/10">
            {this.state.message}
            {this.state.stack ? `\n\n${this.state.stack}` : ''}
          </pre>
        </div>
      </div>
    )
  }
}

