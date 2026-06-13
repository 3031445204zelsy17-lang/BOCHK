/** Step 2: 服务匹配 — BOCHK 产品推荐卡片列表 */

import { useState, useEffect, useCallback } from "react"
import { Lightbulb, ClipboardList, ArrowRight } from "lucide-react"
import type { CompanyProfile, ProductRecommendation } from "@/lib/types"
import { getRecommendations } from "@/lib/api"
import { cn } from "@/lib/utils"
import { BrandedLoading } from "@/components/shared/Loading"

interface Step4Props {
  profile: CompanyProfile
  onComplete: (recommendations: ProductRecommendation[]) => void
}

// ── 匹配度等级 ──────────────────────────────────────
function matchLevel(score: number) {
  if (score >= 85) return { label: "高度匹配", color: "text-esg-green", bar: "bg-esg-green" }
  if (score >= 70) return { label: "中度匹配", color: "text-esg-yellow", bar: "bg-esg-yellow" }
  return { label: "一般匹配", color: "text-esg-red", bar: "bg-esg-red" }
}

export default function Step4Matching({ profile, onComplete }: Step4Props) {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getRecommendations(profile)
      setRecommendations(result.recommendations)
      // 默认展开第一个
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
    // 初始挂载时自动加载推荐；数据获取在 effect 中完成，此处禁用过于严格的 set-state-in-effect 规则
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecommendations()
  }, [loadRecommendations])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto relative min-h-[400px]">
        <BrandedLoading
          messages={[
            "正在匹配 BOCHK 产品...",
            "正在计算推荐分数...",
            "正在生成产品建议...",
          ]}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-1">Step 2：服务匹配</h2>
      <p className="text-sm text-bochk-gray mb-6">
        基于「{profile.industry_tags[0]}」行业 · {profile.size_level}企业
        {profile.export_markets.length > 0 && ` · 目标${profile.export_markets.join("、")}`}
        ，为您推荐以下 BOCHK 产品
      </p>

      {/* ═══ 推荐产品列表 ══════════════════════════════ */}
      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const level = matchLevel(rec.match_score)
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
                  {/* 排名序号 */}
                  <div className="w-7 h-7 rounded-full bg-bochk-red text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-bochk-dark">
                        {rec.product_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-bochk-light rounded text-bochk-gray">
                        {rec.category}
                      </span>
                    </div>
                    <div className="text-xs text-bochk-gray mt-0.5">
                      {rec.amount_range}
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
                  {/* 产品简介 */}
                  {rec.description && (
                    <div className="text-bochk-gray">{rec.description}</div>
                  )}

                  {/* 推荐理由 */}
                  <div className="bg-bochk-blue/5 rounded p-3">
                    <div className="font-medium text-bochk-blue text-xs mb-1 inline-flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" /> AI 推荐理由
                    </div>
                    <div className="text-bochk-dark">{rec.reason}</div>
                  </div>

                  {/* 使用建议 */}
                  <div className="bg-esg-green/5 rounded p-3">
                    <div className="font-medium text-esg-green text-xs mb-1 inline-flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" /> 使用建议
                    </div>
                    <div className="text-bochk-dark">{rec.advice}</div>
                  </div>

                  {/* 产品特色 */}
                  {rec.key_features && rec.key_features.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-bochk-gray mb-1.5">
                        产品特色
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.key_features.map((f, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-bochk-red/5 text-bochk-red rounded"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 所需文件 */}
                  {rec.required_docs && rec.required_docs.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-bochk-gray mb-1.5">
                        申请材料
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.required_docs.map((d, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-bochk-light text-bochk-gray rounded"
                          >
                            {d}
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
        下一步：ESG 合规分析 <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
