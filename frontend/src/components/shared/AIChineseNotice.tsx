/** 英文模式下 AI 内容中文提示条 — 仅 en 语言时显示 */

import { useTranslation } from "react-i18next"
import { AlertCircle } from "lucide-react"

export default function AIChineseNotice() {
  const { i18n, t } = useTranslation()

  if (i18n.language !== "en") return null

  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 my-3">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{t("common.aiChineseNotice")}</span>
    </div>
  )
}
