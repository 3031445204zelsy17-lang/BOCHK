/** Step 5: ESG 合规分析 — 占位页面 */

import type { CompanyProfile } from "@/lib/types"

interface Step5Props {
  profile: CompanyProfile
}

export default function Step5ESG({ profile }: Step5Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">ESG 合规分析</h2>
      <p className="text-sm text-bochk-gray mb-6">
        基于「{profile.industry_tags[0]}」行业 · 目标市场合规缺口识别
      </p>

      {/* 占位：后续 P5-2 实现问卷和分析 */}
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold mb-2">ESG 合规分析模块</h3>
        <p className="text-sm text-bochk-gray">
          此模块将在 Phase 5 实现，包含：
        </p>
        <ul className="text-sm text-bochk-gray mt-2 space-y-1">
          <li>• 目标国家 ESG 法规问卷（15-20 题）</li>
          <li>• 合规缺口识别（红/黄/绿交通灯）</li>
          <li>• 双标准分析（目的地法规 + BOCHK 准入）</li>
          <li>• 改善路线图建议</li>
        </ul>
      </div>
    </div>
  )
}
