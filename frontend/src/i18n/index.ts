import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
] as const

export type LanguageCode = typeof supportedLanguages[number]['code']

// 从 localStorage 读取用户语言偏好，默认跟随系统
function getInitialLanguage(): LanguageCode {
  // 1. 优先使用用户保存的偏好
  const saved = localStorage.getItem('start:language')
  if (saved && supportedLanguages.some(l => l.code === saved)) {
    return saved as LanguageCode
  }
  
  // 2. 尝试匹配浏览器语言
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  
  // 3. 默认英文
  return 'en-US'
}

// 初始化 i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'zh-CN', // 翻译缺失时回退到中文
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
    // 开发模式下显示缺失的翻译 key
    debug: import.meta.env.DEV,
    // 缺失翻译时的处理
    saveMissing: false,
    missingKeyHandler: import.meta.env.DEV 
      ? (_lngs, _ns, key) => {
          console.warn(`[i18n] Missing translation: ${key}`)
        }
      : undefined,
  })

// 切换语言并保存到 localStorage
export function changeLanguage(lang: LanguageCode) {
  localStorage.setItem('start:language', lang)
  return i18n.changeLanguage(lang)
}

// 获取当前语言
export function getCurrentLanguage(): LanguageCode {
  return i18n.language as LanguageCode
}

export default i18n
