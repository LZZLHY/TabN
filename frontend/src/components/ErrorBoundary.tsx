import React from 'react'

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
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', err)
  }

  render() {
    if (!this.state.hasError) return this.props.children

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

