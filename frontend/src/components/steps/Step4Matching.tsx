/** Step 4: 服务匹配 — BOCHK 产品推荐卡片 */

import { useState, useEffect } from "react"
import type { CompanyProfile, ProductRecommendation } from "@/lib/types"
import { getRecommendations } from "@/lib/api"

// ── Mock fallback ──────────────────────────────────
const MOCK_RECOMMENDATIONS: ProductRecommendation[] = [
  {
    product_id: "xqi",
    product_name: "小企钱",
    match_score: 92,
    amount_range: "HK$50万 - 500万",
    reason: "基于贵司在电子制造领域的稳定出口业绩和中等规模，小企钱能提供灵活的营运资金支持。",
    advice: "建议准备近三个月银行流水和商业登记证，可快速获得批核。",
  },
  {
    product_id: "trade_finance",
    product_name: "贸易融资",
    match_score: 87,
    amount_range: "根据交易金额而定",
    reason: "贵司已有东南亚出口经验，贸易融资可为跨境交易提供信用证和发票融资支持。",
    advice: "建议整理现有贸易合同和出口发票，配合信用证申请流程。",
  },
  {
    product_id: "supply_chain",
    product_name: "供应链融资",
    match_score: 78,
    amount_range: "根据供应链规模而定",
    reason: "作为电子元器件制造商，贵司在供应链中处于关键位置，可帮助优化上下游资金周转。",
    advice: "建议梳理核心供应商和客户关系，准备供应链合同材料。",
  },
  {
    product_id: "forex_management",
    product_name: "外汇管理",
    match_score: 75,
    amount_range: "不限",
    reason: "贵司出口东南亚和欧洲市场，涉及多币种结算，外汇管理可有效对冲汇率波动风险。",
    advice: "建议开通多币种账户，了解远期外汇合约锁定汇率策略。",
  },
]

interface Step4Props {
  profile: CompanyProfile
  onComplete: () => void
}

export default function Step4Matching({ profile, onComplete }: Step4Props) {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const result = await getRecommendations(profile)
      setRecommendations(result.recommendations)
    } catch {
      console.warn("后端未连接，使用 mock 数据")
      setRecommendations(MOCK_RECOMMENDATIONS)
    } finally {
      setLoading(false)
    }
  }

  // 匹配度颜色
  const scoreColor = (score: number) => {
    if (score >= 85) return "text-esg-green"
    if (score >= 70) return "text-esg-yellow"
    return "text-esg-red"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-bochk-gray">正在匹配 BOCHK 产品...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">服务匹配</h2>
      <p className="text-sm text-bochk-gray mb-6">
        基于「{profile.industry_tags[0]}」行业 · {profile.size_level}企业 ·
        为您推荐以下 BOCHK 产品
      </p>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div key={rec.product_id} className="card">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpanded(expanded === rec.product_id ? null : rec.product_id)
              }
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold">{rec.product_name}</div>
                <span className="text-xs px-2 py-0.5 bg-bochk-light rounded text-bochk-gray">
                  {rec.amount_range}
                </span>
              </div>
              <div className={`text-2xl font-bold ${scoreColor(rec.match_score)}`}>
                {rec.match_score}%
              </div>
            </div>

            {/* 展开详情 */}
            {expanded === rec.product_id && (
              <div className="mt-3 pt-3 border-t border-bochk-border space-y-2 text-sm">
                <div>
                  <span className="font-medium text-bochk-gray">推荐理由：</span>
                  <span>{rec.reason}</span>
                </div>
                <div>
                  <span className="font-medium text-bochk-gray">建议：</span>
                  <span>{rec.advice}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={onComplete} className="btn-primary w-full py-2.5 mt-6">
        下一步：ESG 合规分析 →
      </button>
    </div>
  )
}
