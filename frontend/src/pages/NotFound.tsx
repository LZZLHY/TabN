import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="w-full max-w-xl">
      <div className="glass-modal rounded-2xl p-6 sm:p-8 text-fg animate-in fade-in zoom-in-95 duration-200">
        <div className="text-xl font-semibold">404</div>
        <div className="mt-2 text-sm text-fg/75">{t('error.notFoundHint')}</div>

        <div className="mt-5">
          <NavLink to="/">
            <Button variant="primary">{t('error.backHome')}</Button>
          </NavLink>
        </div>
      </div>
    </div>
  )
}


