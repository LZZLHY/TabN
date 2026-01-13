import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'

export function ExtensionMarketPage() {
  return (
    <div className="w-full max-w-3xl">
      <div className="glass-modal rounded-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-xl font-semibold text-fg">拓展商城</div>
        <div className="mt-2 text-sm text-fg/75 leading-relaxed">
          这里后面会做：搜索 / 分类 / 评分 / 版本管理 / 安装与更新。
          <br />
          现在先把页面占住，保证路由和侧边栏能正常跳转。
        </div>

        <div className="mt-5">
          <Button onClick={() => toast('拓展商城：施工中～')}>来个 toast</Button>
        </div>
      </div>
    </div>
  )
}


