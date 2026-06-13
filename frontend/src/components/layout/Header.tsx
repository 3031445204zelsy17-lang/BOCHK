/** 顶部导航栏 — BOCHK 红色品牌风格 + 三语切换 */

import { useTranslation } from "react-i18next"
import { LANGUAGES, changeLanguage } from "@/i18n"
import type { SupportedLang } from "@/i18n"

export default function Header() {
  const { t, i18n } = useTranslation()

  return (
    <header className="bg-bochk-red text-white h-auto min-h-14 flex items-center px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3 py-2">
        {/* BOCHK Logo 占位 */}
        <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center text-sm font-bold shrink-0">
          BOCHK
        </div>
        <h1 className="text-base md:text-lg font-semibold tracking-wide">
          {t("header.title")}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span className="hidden sm:block text-sm text-white/70">
          {t("header.subtitle")}
        </span>
        {/* 三语切换 */}
        <div className="flex items-center gap-0.5">
          {LANGUAGES.map((lang) => {
            const isActive = i18n.language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code as SupportedLang)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {lang.label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
