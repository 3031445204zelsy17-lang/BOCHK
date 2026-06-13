/** Step 2: 服务匹配 — BOCHK 产品推荐卡片列表 */

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Lightbulb, ClipboardList, ArrowRight } from "lucide-react"
import type { CompanyProfile, ProductRecommendation } from "@/lib/types"
import { getRecommendations } from "@/lib/api"
import { cn } from "@/lib/utils"
import { BrandedLoading } from "@/components/shared/Loading"
import { toTraditional, isTraditionalChinese } from "@/lib/convertChinese"
import AIChineseNotice from "@/components/shared/AIChineseNotice"

interface Step4Props {
  profile: CompanyProfile
  onComplete: (recommendations: ProductRecommendation[]) => void
}

// ── 匹配度等级 ──────────────────────────────────────
function matchLevel(score: number, t: (key: string) => string) {
  if (score >= 85) return { label: t("step2.matchHigh"), color: "text-esg-green", bar: "bg-esg-green" }
  if (score >= 70) return { label: t("step2.matchMedium"), color: "text-esg-yellow", bar: "bg-esg-yellow" }
  return { label: t("step2.matchLow"), color: "text-esg-red", bar: "bg-esg-red" }
}

export default function Step4Matching({ profile, onComplete }: Step4Props) {
  const { t } = useTranslation()
  const convert = (text: string) => isTraditionalChinese() ? toTraditional(text) : text

  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getRecommendations(profile)
      setRecommendations(result.recommendations)
      if (result.recommendations.length > 0) {
        setExpanded(result.recommendations[0].product_id)
      }
    } catch {
      console.warn("后端未连接")
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecommendations()
  }, [loadRecommendations])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto relative min-h-[400px]">
        <BrandedLoading
          messages={[
            t("step2.loading.msg1"),
            t("step2.loading.msg2"),
            t("step2.loading.msg3"),
          ]}
        />
      </div>
    )
  }

  // 副标题
  const subtitleBase = t("step2.subtitleBase", {
    industry: convert(profile.industry_tags[0]),
    size: convert(profile.size_level),
  })
  const subtitleMarkets = profile.export_markets.length > 0
    ? t("step2.subtitleMarkets", { markets: convert(profile.export_markets.join("、")) })
    : ""
  const subtitleEnd = t("step2.subtitleEnd")

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-1">{t("step2.title")}</h2>
      <p className="text-sm text-bochk-gray mb-6">
        {subtitleBase}{subtitleMarkets}{subtitleEnd}
      </p>

      <AIChineseNotice />

      {/* ═══ 推荐产品列表 ══════════════════════════════ */}
      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const level = matchLevel(rec.match_score, t)
          const isOpen = expanded === rec.product_id

          return (
            <div
              key={rec.product_id}
              className="card animate-fade-in"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
            >
              {/* ── 头部：排名 + 名称 + 匹配度 ── */}
              <div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : rec.product_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-bochk-red text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-bochk-dark">
                        {convert(rec.product_name)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-bochk-light rounded text-bochk-gray">
                        {convert(rec.category)}
                      </span>
                    </div>
                    <div className="text-xs text-bochk-gray mt-0.5">
                      {convert(rec.amount_range)}
                    </div>
                  </div>
                </div>

                {/* 匹配度 */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={cn("rounded-full h-2 transition-all duration-500", level.bar)}
                        style={{ width: `${rec.match_score}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <div className={cn("text-xl font-bold", level.color)}>
                      {rec.match_score}%
                    </div>
                    <div className={cn("text-[10px]", level.color)}>{level.label}</div>
                  </div>
                </div>
              </div>

              {/* ── 展开详情 ── */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-bochk-border space-y-3 text-sm">
                  {rec.description && (
                    <div className="text-bochk-gray">{convert(rec.description)}</div>
                  )}

                  <div className="bg-bochk-blue/5 rounded p-3">
                    <div className="font-medium text-bochk-blue text-xs mb-1 inline-flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" /> {t("step2.aiReason")}
                    </div>
                    <div className="text-bochk-dark">{convert(rec.reason)}</div>
                  </div>

                  <div className="bg-esg-green/5 rounded p-3">
                    <div className="font-medium text-esg-green text-xs mb-1 inline-flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" /> {t("step2.usageAdvice")}
                    </div>
                    <div className="text-bochk-dark">{convert(rec.advice)}</div>
                  </div>

                  {rec.key_features && rec.key_features.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-bochk-gray mb-1.5">
                        {t("step2.productFeatures")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.key_features.map((f, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-bochk-red/5 text-bochk-red rounded"
                          >
                            {convert(f)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rec.required_docs && rec.required_docs.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-bochk-gray mb-1.5">
                        {t("step2.applicationMaterials")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.required_docs.map((d, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-bochk-light text-bochk-gray rounded"
                          >
                            {convert(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ═══ 下一步按钮 ══════════════════════════════ */}
      <button onClick={() => onComplete(recommendations)} className="btn-primary w-full py-2.5 mt-6 inline-flex items-center justify-center gap-1">
        {t("step2.nextStep")} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
