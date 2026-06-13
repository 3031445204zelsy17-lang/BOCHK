/** i18n 配置 — 简中 / 繁中 / English 三语言 */

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import zhCN from "./locales/zh-CN.json"
import zhTW from "./locales/zh-TW.json"
import en from "./locales/en.json"

/** localStorage 键名 */
const STORAGE_KEY = "bochk-lang"

/** 支持的语言列表 */
export const LANGUAGES = [
  { code: "zh-CN", label: "简" },
  { code: "zh-TW", label: "繁" },
  { code: "en", label: "EN" },
] as const

export type SupportedLang = (typeof LANGUAGES)[number]["code"]

/** 检测初始语言 */
function detectLanguage(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored
  const nav = navigator.language
  if (nav.startsWith("zh-TW") || nav.startsWith("zh-HK") || nav.startsWith("zh-MO")) return "zh-TW"
  if (nav.startsWith("zh")) return "zh-CN"
  if (nav.startsWith("en")) return "en"
  return "zh-CN"
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "zh-TW": { translation: zhTW },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
})

/** 切换语言并持久化 */
export function changeLanguage(code: SupportedLang) {
  localStorage.setItem(STORAGE_KEY, code)
  i18n.changeLanguage(code)
}

export default i18n
